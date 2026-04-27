import { Channel, ConsumeMessage } from "amqplib";
import { config } from "../../../../shared/config/index.js";
import { InventoryService } from "../services/inventory.service.js";
import { OrderCreatedEvent } from "../../../../shared/types/index.js";
import { InvalidOrderEventError } from "../../../../shared/errors/index.js";
import { logger } from "../../../../shared/infrastructure/logger.js";

export class OrderConsumer {
  constructor(
    private channel: Channel,
    private service: InventoryService,
  ) {}

  async startListening(): Promise<void> {
    const { queues, exchanges, routingKeys } = config.rabbitmq;
    await this.channel.assertQueue(queues.dlq, { durable: true });
    await this.channel.bindQueue(
      queues.dlq,
      exchanges.dlx,
      routingKeys.orderFailed,
    );

    await this.channel.assertQueue(queues.order, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": exchanges.dlx,
        "x-dead-letter-routing-key": routingKeys.orderFailed,
      },
    });
    await this.channel.bindQueue(
      queues.order,
      exchanges.order,
      routingKeys.orderCreated,
    );

    this.channel.prefetch(1);

    this.channel.consume(queues.order, async (msg: ConsumeMessage | null) => {
      if (msg === null) return;

      try {
        const orderEvent = JSON.parse(
          msg.content.toString(),
        ) as Partial<OrderCreatedEvent>;

        const timestamp =
          typeof orderEvent.timestamp === "string"
            ? Date.parse(orderEvent.timestamp)
            : Number.NaN;

        if (!Number.isNaN(timestamp)) {
          const lagInSeconds = (Date.now() - timestamp) / 1000;
          void lagInSeconds;
        }

        if (
          typeof orderEvent.messageId !== "string" ||
          typeof orderEvent.orderId !== "string" ||
          typeof orderEvent.userId !== "string" ||
          typeof orderEvent.productId !== "string" ||
          typeof orderEvent.quantity !== "number" ||
          typeof orderEvent.timestamp !== "string"
        ) {
          throw new InvalidOrderEventError();
        }

        const result = await this.service.processOrderCreation(
          orderEvent as OrderCreatedEvent,
        );

        if (result?.skipped) {
          this.channel.ack(msg);
          return;
        }

        this.channel.ack(msg);
      } catch (error) {
        logger.error(error, "Failed to process order creation");
        this.channel.nack(msg, false, false);
      }
    });
  }
}
