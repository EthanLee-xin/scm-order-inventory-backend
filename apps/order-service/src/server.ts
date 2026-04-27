import Fastify, { FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { config } from "../../../shared/config/index.js";
import { logger } from "../../../shared/infrastructure/logger.js";
import { pgPool } from "../../../shared/infrastructure/postgres.js";
import { connectRabbitMQ } from "../../../shared/infrastructure/rabbitmq.js";
import { OrderRoutes } from "./routes/order.routes.js";
import { SystemRoutes } from "./routes/system.routes.js";
import { OrderRepository } from "./repositories/order.repository.js";
import { OutboxRepository } from "./repositories/outbox.repository.js";
import { OrderService } from "./services/order.service.js";
import { OutboxPublisherWorker } from "./worker/outbox.publisher.js";

const fastify: FastifyInstance = Fastify({
  logger,
}).withTypeProvider<TypeBoxTypeProvider>();

async function bootstrap() {
  try {
    const { channel } = await connectRabbitMQ();

    const orderRepo = new OrderRepository(pgPool);
    const outboxRepo = new OutboxRepository(pgPool);
    const orderService = new OrderService(orderRepo, outboxRepo);
    const outboxWorker = new OutboxPublisherWorker({channel, outboxRepo});

    await fastify.register(SystemRoutes, { prefix: "api", pgPool });
    await fastify.register(OrderRoutes, { prefix: "api", orderService });

    await outboxWorker.start();

    await fastify.listen({ port: config.server.port, host: "0.0.0.0" });
    logger.info(`order-service listening on ${config.server.port}`);
  } catch (error) {
    logger.error({ error }, "order-service failed to start");
    process.exit(1);
  }
}

bootstrap();
