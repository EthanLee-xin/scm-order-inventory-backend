import { Type, Static } from "@sinclair/typebox";
import { ApiSuccessResponseSchema, ApiErrorResponseSchema } from "./common.js";

export const OrderIdempotencyHeaderSchema = Type.Object({
  "idempotency-key": Type.String({
    minLength: 8,
    description: "Idempotency key for request deduplication",
  }),
});

export const OrderCreateBodySchema = Type.Object({
  productId: Type.String({ minLength: 1, description: "Product unique ID" }),
  quantity: Type.Integer({
    minimum: 1,
    maximum: 1000,
    description: "Purchasing quantity",
  }),
});

export const OrderAcceptedDataSchema = Type.Object({
  message: Type.String(),
  orderId: Type.String(),
  status: Type.String(),
});

export const OrderAcceptedResponseSchema = ApiSuccessResponseSchema(
  OrderAcceptedDataSchema,
);

export const OrderErrorResponseSchema = ApiErrorResponseSchema;

export type OrderIdempotencyHeader = Static<
  typeof OrderIdempotencyHeaderSchema
>;
export type OrderCreateBody = Static<typeof OrderCreateBodySchema>;
export type OrderAcceptedData = Static<typeof OrderAcceptedDataSchema>;
export type OrderAcceptedResponse = Static<typeof OrderAcceptedResponseSchema>;
