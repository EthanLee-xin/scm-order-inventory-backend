// cspell:ignore typebox
import { FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { OrderClient } from "../clients/order.client.js";
import {
  getCachedIdempotencyRecord,
  reserveIdempotencyKey,
  storeIdempotencyRecord,
  releaseIdempotencyReservation,
  getDefaultIdempotencyTtlSeconds,
} from "../../../../shared/infrastructure/idempotency.js";
import { sendSuccess, sendError } from "../../../../shared/http/response.js";
import { orderRequestsTotal } from "../../../../shared/infrastructure/metrics.js";
import {
  OrderIdempotencyHeaderSchema,
  OrderCreateBodySchema,
  OrderAcceptedResponseSchema,
  OrderErrorResponseSchema,
} from "../../../../shared/api-contracts/index.js";

interface OrderPluginOptions {
  orderClient: OrderClient;
}

export async function OrderRoutes(
  fastify: FastifyInstance,
  opts: OrderPluginOptions,
) {
  const { orderClient } = opts;
  const typedFastify = fastify.withTypeProvider<TypeBoxTypeProvider>();

  typedFastify.post(
    "/orders",
    {
      schema: {
        tags: ["Orders"],
        summary: "Create an order",
        description:
          "Creates a Nike SCM order with idempotency protection and asynchronous downstream processing.",
        security: [{ bearerAuth: [] }],
        headers: OrderIdempotencyHeaderSchema,
        body: OrderCreateBodySchema,
        response: {
          202: {
            ...OrderAcceptedResponseSchema,
            example: {
              success: true,
              data: {
                message: "Order Accepted",
                orderId: "ORD_1234567890",
                status: "PROCESSING",
              },
            },
          },
          400: {
            ...OrderErrorResponseSchema,
            example: {
              success: false,
              error: {
                code: "IDEMPOTENCY_KEY_REQUIRED",
                message: "Idempotency-Key header is required",
              },
            },
          },
          404: {
            ...OrderErrorResponseSchema,
            example: {
              success: false,
              error: {
                code: "PRODUCT_NOT_FOUND",
                message: "Product not Exist.",
              },
            },
          },
          409: {
            ...OrderErrorResponseSchema,
            example: {
              success: false,
              error: {
                code: "REQUEST_IN_PROGRESS",
                message: "The same idempotency key is being processed",
              },
            },
          },
          500: {
            ...OrderErrorResponseSchema,
            example: {
              success: false,
              error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Internal Server Error",
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      orderRequestsTotal.inc();

      const idempotencyKey = request.headers["idempotency-key"];

      if (typeof idempotencyKey !== "string" || idempotencyKey.length === 0) {
        return sendError(
          reply,
          "IDEMPOTENCY_KEY_REQUIRED",
          "Idempotency-Key header is required",
          400,
        );
      }

      const cachedRecord = await getCachedIdempotencyRecord<{
        message: string;
        orderId: string;
        status: string;
      }>(idempotencyKey);

      if (cachedRecord !== null) {
        return sendSuccess(reply, cachedRecord.body, cachedRecord.statusCode);
      }

      const reservation = await reserveIdempotencyKey(idempotencyKey);

      if (!reservation.acquired) {
        return sendError(
          reply,
          "REQUEST_IN_PROGRESS",
          "The same idempotency key is being processed",
          409,
        );
      }

      const { productId, quantity } = request.body;
      const userId = request.user.id;

      try {
        const result = await orderClient.processOrder(
          userId,
          productId,
          quantity,
        );

        const responseBody = {
          message: "Order Accepted",
          orderId: result.orderId,
          status: result.status,
        };

        await storeIdempotencyRecord(
          idempotencyKey,
          {
            statusCode: 202,
            body: responseBody,
          },
          getDefaultIdempotencyTtlSeconds(),
        );

        return sendSuccess(reply, responseBody, 202);
      } catch (error: unknown) {
        fastify.log.error({ error, idempotencyKey }, "Failed to process order");
        return sendError(
          reply,
          "INTERNAL_SERVER_ERROR",
          "Internal Server Error",
          500,
        );
      } finally {
        await releaseIdempotencyReservation(idempotencyKey);
      }
    },
  );
}
