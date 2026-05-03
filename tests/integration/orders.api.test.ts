// cspell:ignore typebox
import Fastify from "fastify";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrderRoutes } from "../../apps/api-gateway/src/routes/order.routes.js";
import {
  OrderAcceptedResponseSchema,
  OrderCreateBodySchema,
  OrderIdempotencyHeaderSchema,
} from "../../shared/api-contracts/order.js";
import { Value } from "@sinclair/typebox/value";

const mocks = vi.hoisted(() => ({
  processOrderMock: vi.fn(),
  getCachedIdempotencyRecordMock: vi.fn(),
  reserveIdempotencyKeyMock: vi.fn(),
  storeIdempotencyRecordMock: vi.fn(),
  releaseIdempotencyReservationMock: vi.fn(),
}));

vi.mock("../../shared/infrastructure/idempotency.js", () => ({
  getCachedIdempotencyRecord: mocks.getCachedIdempotencyRecordMock,
  reserveIdempotencyKey: mocks.reserveIdempotencyKeyMock,
  storeIdempotencyRecord: mocks.storeIdempotencyRecordMock,
  releaseIdempotencyReservation: mocks.releaseIdempotencyReservationMock,
  getDefaultIdempotencyTtlSeconds: () => 86400,
}));

describe("orders API integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getCachedIdempotencyRecordMock.mockResolvedValue(null);
    mocks.reserveIdempotencyKeyMock.mockResolvedValue({ acquired: true });
    mocks.storeIdempotencyRecordMock.mockResolvedValue(undefined);
    mocks.releaseIdempotencyReservationMock.mockResolvedValue(undefined);
    mocks.processOrderMock.mockResolvedValue({
      orderId: "ORD-1",
      status: "PROCESSING",
    });
  });

  it("validates the order request contract", () => {
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
  });

  it("returns acceptance payload that matches the response contract", async () => {
    const app = Fastify();

    app.addHook("preHandler", async (request) => {
      request.user = { id: "user-1", role: "buyer" };
    });

    await app.register(OrderRoutes, {
      prefix: "/api",
      orderClient: { processOrder: mocks.processOrderMock } as any,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/orders",
      headers: {
        "idempotency-key": "test-key-123",
      },
      payload: {
        productId: "P10001",
        quantity: 2,
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(202);
    expect(Value.Check(OrderAcceptedResponseSchema, body)).toBe(true);
    expect(body).toEqual({
      success: true,
      data: {
        message: "Order Accepted",
        orderId: "ORD-1",
        status: "PROCESSING",
      },
    });
    expect(mocks.processOrderMock).toHaveBeenCalledWith("user-1", "P10001", 2);
    expect(mocks.storeIdempotencyRecordMock).toHaveBeenCalledTimes(1);

    await app.close();
  });
});
