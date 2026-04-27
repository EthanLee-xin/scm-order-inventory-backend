import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrderService } from "../../apps/order-service/src/services/order.service.js";
import { InvalidOrderEventError } from "../../shared/errors/index.js";
import { OrderStatus } from "../../shared/types/order-status.js";

const createOrderMock = vi.fn();
const createEventMock = vi.fn();

vi.mock("uuid", () => ({
  v4: () => "11111111-1111-1111-1111-111111111111",
}));

vi.mock("../../shared/utils/snowflake.js", () => ({
  generateOrderId: () => "ORD_182736451234567890",
}));

describe("OrderService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates order and outbox event for a valid request", async () => {
    createOrderMock.mockResolvedValue(undefined);
    createEventMock.mockResolvedValue(undefined);

    const orderRepo = {
      createOrder: createOrderMock,
    } as any;

    const outboxRepo = {
      createEvent: createEventMock,
    } as any;

    const service = new OrderService(orderRepo, outboxRepo);

    const result = await service.createOrder({
      userId: "user-1",
      productId: "P10001",
      quantity: 2,
    });

    expect(result).toEqual({
      message: "Order Accepted",
      orderId: "ORD_182736451234567890",
      status: OrderStatus.PROCESSING,
    });

    expect(createOrderMock).toHaveBeenCalledTimes(1);
    expect(createOrderMock).toHaveBeenCalledWith({
      orderId: "ORD_182736451234567890",
      userId: "user-1",
      productId: "P10001",
      quantity: 2,
      status: OrderStatus.PROCESSING,
    });

    expect(createEventMock).toHaveBeenCalledTimes(1);
    expect(createEventMock).toHaveBeenCalledWith({
      eventId: "EVT_11111111-1111-1111-1111-111111111111",
      eventType: "ORDER_CREATED",
      aggregateId: "ORD_182736451234567890",
      payload: {
        eventId: "EVT_11111111-1111-1111-1111-111111111111",
        orderId: "ORD_182736451234567890",
        userId: "user-1",
        productId: "P10001",
        quantity: 2,
        status: OrderStatus.PROCESSING,
        timestamp: expect.any(String),
      },
    });
  });

  it("throws InvalidOrderEventError when payload is invalid", async () => {
    const orderRepo = {
      createOrder: createOrderMock,
    } as any;

    const outboxRepo = {
      createEvent: createEventMock,
    } as any;

    const service = new OrderService(orderRepo, outboxRepo);

    await expect(
      service.createOrder({
        userId: "user-1",
        productId: "P10001",
        quantity: 0,
      }),
    ).rejects.toBeInstanceOf(InvalidOrderEventError);

    expect(createOrderMock).not.toHaveBeenCalled();
    expect(createEventMock).not.toHaveBeenCalled();
  });
});
