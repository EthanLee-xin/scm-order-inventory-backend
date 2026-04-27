import Fastify from "fastify";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrderRoutes } from "../../apps/api-gateway/src/routes/order.routes.js";

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

  it("returns acceptance payload for a valid order request", async () => {
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

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({
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
