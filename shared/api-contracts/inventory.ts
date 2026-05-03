import { Static, Type } from "@sinclair/typebox";

export const InventoryOrderCreatedEventSchema = Type.Object({
  messageId: Type.String({ minLength: 1 }),
  orderId: Type.String({ minLength: 1 }),
  userId: Type.String({ minLength: 1 }),
  productId: Type.String({ minLength: 1 }),
  quantity: Type.Integer({ minimum: 1 }),
  status: Type.String({ minLength: 1 }),
  timestamp: Type.String({ minLength: 1 }),
});

export const InventoryProcessedEventSchema = Type.Object({
  orderId: Type.String({ minLength: 1 }),
  productId: Type.String({ minLength: 1 }),
  quantity: Type.Integer({ minimum: 1 }),
  remainingStock: Type.Integer(),
  status: Type.String({ minLength: 1 }),
});

export const InventoryFailedEventSchema = Type.Object({
  orderId: Type.String({ minLength: 1 }),
  productId: Type.String({ minLength: 1 }),
  quantity: Type.Integer({ minimum: 1 }),
  reason: Type.String({ minLength: 1 }),
  retryable: Type.Boolean(),
});

export type InventoryOrderCreatedEvent = Static<
  typeof InventoryOrderCreatedEventSchema
>;
export type InventoryProcessedEvent = Static<
  typeof InventoryProcessedEventSchema
>;
export type InventoryFailedEvent = Static<typeof InventoryFailedEventSchema>;
