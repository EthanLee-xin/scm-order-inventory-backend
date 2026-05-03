import { InventoryRepository } from "../repositories/inventory.repository.js";
import { MessageInboxRepository } from "../repositories/message-inbox.repository.js";
import {InventoryOrderCreatedEvent} from '../../../../shared/api-contracts/index.js'
import { InvalidOrderEventError } from "../../../../shared/errors/index.js";
import { OrderStatus } from "../../../../shared/types/order-status.js";
import { canTransitionOrderStatus } from "../../../../shared/types/order-transitions.js";

export class InventoryService {
  constructor(
    private repo: InventoryRepository,
    private inboxRepo: MessageInboxRepository,
  ) {}

  async processOrderCreation(orderEvent: InventoryOrderCreatedEvent) {
    if (
      !orderEvent ||
      typeof orderEvent.messageId !== "string" ||
      typeof orderEvent.orderId !== "string" ||
      typeof orderEvent.userId !== "string" ||
      typeof orderEvent.productId !== "string" ||
      typeof orderEvent.quantity !== "number" ||
      typeof orderEvent.timestamp !== "string"
    ) {
      throw new InvalidOrderEventError();
    }

    const currentStatus = OrderStatus.PROCESSING;
    const nextStatus = OrderStatus.PAID;

    if (!canTransitionOrderStatus(currentStatus, nextStatus)) {
      throw new Error(
        `Invalid order status transition from ${currentStatus} to ${nextStatus}`,
      );
    }

    const reserved = await this.inboxRepo.reserveMessage(
      orderEvent.messageId,
      orderEvent.orderId,
    );

    if (!reserved) {
      return {
        skipped: true,
      };
    }

    try {
      const currentStock = await this.repo.executeOrderTransaction(
        orderEvent,
        nextStatus,
      );

      await this.inboxRepo.markMessageProcessed(orderEvent.messageId);

      return {
        skipped: false,
        currentStock,
        nextStatus,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await this.inboxRepo.markMessageFailed(
        orderEvent.messageId,
        errorMessage,
      );
      throw error;
    }
  }
}
