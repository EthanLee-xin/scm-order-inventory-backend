// cspell:ignore typebox
import { describe, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import {
  ApiErrorResponseSchema,
  ApiSuccessResponseSchema,
} from "../../shared/api-contracts/common.js";
import {
  OrderAcceptedDataSchema,
  OrderAcceptedResponseSchema,
  OrderCreateBodySchema,
  OrderIdempotencyHeaderSchema,
} from "../../shared/api-contracts/order.js";
import {
  AuthorizationHeaderSchema,
  UserPayloadSchema,
} from "../../shared/api-contracts/auth.js";
import {
  InventoryFailedEventSchema,
  InventoryOrderCreatedEventSchema,
  InventoryProcessedEventSchema,
} from "../../shared/api-contracts/inventory.js";

describe("API contracts", () => {
  it("validates the shared success and error envelopes", () => {
    const successSchema = ApiSuccessResponseSchema(OrderAcceptedDataSchema);

    expect(
      Value.Check(successSchema, {
        success: true,
        data: {
          message: "Order Accepted",
          orderId: "ORD_123",
          status: "PROCESSING",
        },
      }),
    ).toBe(true);

    expect(
      Value.Check(ApiErrorResponseSchema, {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal Server Error",
        },
      }),
    ).toBe(true);
  });

  it("validates the order request and response contracts", () => {
    expect(
      Value.Check(OrderIdempotencyHeaderSchema, {
        "idempotency-key": "test-key-123",
      }),
    ).toBe(true);

    expect(
      Value.Check(OrderCreateBodySchema, {
        productId: "P10001",
        quantity: 2,
      }),
    ).toBe(true);

    expect(
      Value.Check(OrderAcceptedDataSchema, {
        message: "Order Accepted",
        orderId: "ORD_123",
        status: "PROCESSING",
      }),
    ).toBe(true);

    expect(
      Value.Check(OrderAcceptedResponseSchema, {
        success: true,
        data: {
          message: "Order Accepted",
          orderId: "ORD_123",
          status: "PROCESSING",
        },
      }),
    ).toBe(true);
  });

  it("validates the auth contracts", () => {
    expect(
      Value.Check(AuthorizationHeaderSchema, {
        authorization: "Bearer test-token",
      }),
    ).toBe(true);

    expect(
      Value.Check(UserPayloadSchema, {
        id: "user-1",
        role: "buyer",
      }),
    ).toBe(true);
  });

  it("validates the inventory event contracts", () => {
    expect(
      Value.Check(InventoryOrderCreatedEventSchema, {
        messageId: "EVT_1",
        orderId: "ORD_1",
        userId: "user-1",
        productId: "P10001",
        quantity: 2,
        status: "PROCESSING",
        timestamp: "2025-01-01T00:00:00.000Z",
      }),
    ).toBe(true);

    expect(
      Value.Check(InventoryProcessedEventSchema, {
        orderId: "ORD_1",
        productId: "P10001",
        quantity: 2,
        remainingStock: 8,
        status: "PROCESSED",
      }),
    ).toBe(true);

    expect(
      Value.Check(InventoryFailedEventSchema, {
        orderId: "ORD_1",
        productId: "P10001",
        quantity: 2,
        reason: "OUT_OF_STOCK",
        retryable: false,
      }),
    ).toBe(true);
  });
});
