import { FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { OrderStatus } from "../../../../shared/types/index.js";
import { sendSuccess, sendError } from "../../../../shared/http/response.js";
import { OrderService } from "../services/order.service.js";
import { InvalidOrderEventError } from "../../../../shared/errors/index.js";

interface OrderRoutesOptions {
  orderService: OrderService;
}

const OrderBodySchema = Type.Object({
  productId: Type.String({ minLength: 1 }),
  quantity: Type.Integer({
    minimum: 1,
    maximum: 1000,
  }),
});

const OrderAcceptedDataSchema = Type.Object({
  message: Type.String(),
  orderId: Type.String(),
  status: Type.Literal(OrderStatus.PROCESSING),
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
  opts: OrderRoutesOptions,
) {
  const typedFastify = fastify.withTypeProvider<TypeBoxTypeProvider>();
  const { orderService } = opts;

  typedFastify.post(
    "/orders",
    {
      schema: {
        body: OrderBodySchema,
        response: {
          202: OrderAcceptedResponseSchema,
          400: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await orderService.createOrder({
          userId: request.user.id,
          productId: request.body.productId,
          quantity: request.body.quantity,
        });

        return sendSuccess(reply, result, 202);
      } catch (error: unknown) {
        if (error instanceof InvalidOrderEventError) {
          return sendError(reply, error.code, error.message, error.statusCode);
        }

        return sendError(
          reply,
          "INTERNAL_SERVER_ERROR",
          "Internal Server Error",
          500,
        );
      }
    },
  );
}
