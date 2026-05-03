// cspell:ignore typebox
import { describe, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import {
  InventoryFailedEventSchema,
  InventoryOrderCreatedEventSchema,
  InventoryProcessedEventSchema,
} from "../../shared/api-contracts/inventory.js";

describe("inventory contracts", () => {
  it("validates the inventory order created event contract", () => {
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
  });

  it("validates the processed inventory event contract", () => {
    expect(
      Value.Check(InventoryProcessedEventSchema, {
        orderId: "ORD_1",
        productId: "P10001",
        quantity: 2,
        remainingStock: 8,
        status: "PROCESSED",
      }),
    ).toBe(true);
  });

  it("validates the failed inventory event contract", () => {
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
