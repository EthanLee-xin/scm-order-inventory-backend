import { pgPool } from "../../../shared/infrastructure/postgres.js";
import { connectRabbitMQ } from "../../../shared/infrastructure/rabbitmq.js";
import { logger } from "../../../shared/infrastructure/logger.js";

import { InventoryRepository } from "./repositories/inventory.repository.js";
import { MessageInboxRepository } from "./repositories/message-inbox.repository.js";
import { InventoryService } from "./services/inventory.service.js";
import { OrderConsumer } from "./consumers/order.consumer.js";

async function bootstrapWorker(): Promise<void> {
  try {
    const { channel } = await connectRabbitMQ();

    const inventoryRepo = new InventoryRepository(pgPool);
    const inboxRepo = new MessageInboxRepository(pgPool);
    const inventoryService = new InventoryService(inventoryRepo, inboxRepo);
    const orderConsumer = new OrderConsumer(channel, inventoryService);

    await orderConsumer.startListening();
    logger.info("Inventory worker started");
  } catch (error) {
    logger.error(error, "Inventory worker failed to start");
    process.exit(1);
  }
}

bootstrapWorker();
