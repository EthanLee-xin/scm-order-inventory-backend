import { FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
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

interface OrderPluginOptions {
  orderClient: OrderClient;
}

const OrderHeaderSchema = Type.Object({
  "idempotency-key": Type.String({
    minLength: 8,
    description: "Idempotency key for request deduplication",
  }),
});

const OrderBodySchema = Type.Object({
  productId: Type.String({ minLength: 1, description: "Product unique ID" }),
  quantity: Type.Integer({
    minimum: 1,
    maximum: 1000,
    description: "Purchasing quantity",
  }),
});

const OrderAcceptedDataSchema = Type.Object({
  message: Type.String(),
  orderId: Type.String(),
  status: Type.String(),
});

const OrderAcceptedResponseSchema = Type.Object({
  success: Type.Literal(true),
  data: OrderAcceptedDataSchema,
});

const ErrorResponseSchema = Type.Object({
  success: Type.Literal(false),
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    details: Type.Optional(Type.Unknown()),
  }),
});

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
        headers: OrderHeaderSchema,
        body: OrderBodySchema,
        response: {
          202: OrderAcceptedResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
          500: ErrorResponseSchema,
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
