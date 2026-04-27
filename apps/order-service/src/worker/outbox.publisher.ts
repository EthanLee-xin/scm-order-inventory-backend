import { Channel } from "amqplib";
import { logger } from "../../../../shared/infrastructure/logger.js";
import { OutboxRepository, OutboxRow } from "../repositories/outbox.repository.js";
import { config } from "../../../../shared/config/index.js";

interface OutboxPublisherOptions {
  channel: Channel;
  outboxRepo: OutboxRepository;
  pollIntervalMs?: number;
  batchSize?: number;
}

export class OutboxPublisherWorker {
  private timer?: NodeJS.Timeout;

  constructor(private readonly opts: OutboxPublisherOptions) {}

  async start(): Promise<void> {
    logger.info(
      {
        pollIntervalMs: this.opts.pollIntervalMs ?? 3000,
        batchSize: this.opts.batchSize ?? 50,
      },
      "Outbox publisher worker started",
    );

    this.timer = setInterval(() => {
      void this.publishPendingEvents();
    }, this.opts.pollIntervalMs ?? 3000);

    await this.publishPendingEvents();
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async publishPendingEvents(): Promise<void> {
    try {
      const events = await this.opts.outboxRepo.fetchPendingEvents(
        this.opts.batchSize ?? 50,
      );

      if (events.length === 0) {
        return;
      }

      for (const event of events) {
        await this.publishSingleEvent(event);
      }
    } catch (error) {
      logger.error({ error }, "Failed to publish outbox events");
    }
  }

  private async publishSingleEvent(event: OutboxRow): Promise<void> {
    try {
      const published = this.opts.channel.publish(
        config.rabbitmq.exchanges.order,
        config.rabbitmq.routingKeys.orderCreated,
        Buffer.from(JSON.stringify(event.payload)),
        {
          persistent: true,
          messageId: event.event_id,
          type: event.event_type,
          timestamp: Date.now(),
        },
      );

      if (!published) {
        logger.warn(
          { eventId: event.event_id },
          "RabbitMQ publish returned backpressure",
        );
      }

      await this.opts.outboxRepo.markPublished(event.event_id);

      logger.info(
        { eventId: event.event_id, aggregateId: event.aggregate_id },
        "Outbox event published",
      );
    } catch (error) {
      logger.error(
        { error, eventId: event.event_id },
        "Failed to publish outbox event",
      );

      await this.opts.outboxRepo.markFailed(
        event.event_id,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }
}
