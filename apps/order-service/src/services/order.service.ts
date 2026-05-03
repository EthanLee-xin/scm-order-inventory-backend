import { v4 as uuidv4 } from "uuid";
import { generateOrderId } from "../../../../shared/utils/snowflake.js";
import { OrderStatus } from "../../../../shared/types/order-status.js";
import { canTransitionOrderStatus } from "../../../../shared/types/order-transitions.js";
import { InvalidOrderEventError } from "../../../../shared/errors/index.js";
import { OrderRepository } from "../repositories/order.repository.js";
import { OutboxRepository } from "../repositories/outbox.repository.js";

export interface CreateOrderInput {
  userId: string;
  productId: string;
  quantity: number;
}

export interface CreateOrderResult {
  message: string;
  orderId: string;
  status: OrderStatus;
}

export class OrderService {
  constructor(
    private orderRepo: OrderRepository,
    private outboxRepo: OutboxRepository,
  ) {}

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const { userId, productId, quantity } = input;

    if (
      typeof userId !== "string" ||
      typeof productId !== "string" ||
      typeof quantity !== "number" ||
      quantity <= 0
    ) {
      throw new InvalidOrderEventError();
    }

    const currentStatus = OrderStatus.PENDING;
    const nextStatus = OrderStatus.PROCESSING;

    if (!canTransitionOrderStatus(currentStatus, nextStatus)) {
      throw new Error(
        `Invalid order status transition from ${currentStatus} to ${nextStatus}`,
      );
    }

    const orderId = generateOrderId();
    const eventId = `EVT_${uuidv4()}`;

    await this.orderRepo.createOrder({
      orderId,
      userId,
      productId,
      quantity,
      status: nextStatus,
    });

    await this.outboxRepo.createEvent({
      eventId,
      eventType: "ORDER_CREATED",
      aggregateId: orderId,
      payload: {
        messageId: eventId,
        orderId,
        userId,
        productId,
        quantity,
        status: nextStatus,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      message: "Order Accepted",
      orderId,
      status: nextStatus,
    };
  }
}
