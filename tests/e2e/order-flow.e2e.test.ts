import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
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

describe("order flow e2e smoke test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCachedIdempotencyRecordMock.mockResolvedValue(null);
    mocks.reserveIdempotencyKeyMock.mockResolvedValue({ acquired: true });
    mocks.storeIdempotencyRecordMock.mockResolvedValue(undefined);
    mocks.releaseIdempotencyReservationMock.mockResolvedValue(undefined);
    mocks.processOrderMock.mockResolvedValue({
      orderId: "ORD-E2E-1",
      status: "PROCESSING",
    });
  });

  it("simulates the full acceptance flow for a successful order", async () => {
    const app = Fastify();

    app.addHook("preHandler", async (request) => {
      request.user = { id: "user-e2e" };
    });

    await app.register(OrderRoutes, {
      prefix: "/api",
      orderClient: { processOrder: mocks.processOrderMock } as any,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/orders",
      headers: {
        "idempotency-key": "e2e-key-123",
      },
      payload: {
        productId: "P20001",
        quantity: 1,
      },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        message: "Order Accepted",
        orderId: "ORD-E2E-1",
        status: "PROCESSING",
      },
    });

    expect(mocks.processOrderMock).toHaveBeenCalledTimes(1);
    expect(mocks.processOrderMock).toHaveBeenCalledWith("user-e2e", "P20001", 1);

    await app.close();
  });
});
