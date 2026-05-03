// cspell:ignore swaggerui
import Fastify, { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { config } from "../../../shared/config/index.js";
import { logger } from "../../../shared/infrastructure/logger.js";

import { authHook } from "./plugins/auth.js";
import { errorHandler } from "./plugins/error-handler.js";
import { OrderClient } from "./clients/order.client.js";
import { OrderRoutes } from "./routes/order.routes.js";
import { SystemRoutes } from "./routes/system.routes.js";

const fastify: FastifyInstance = Fastify({
  logger,
  requestIdHeader: "x-request-id",
  genReqId: (request) => {
    const incomingRequestId = request.headers["x-request-id"];
    if (typeof incomingRequestId === "string" && incomingRequestId.length > 0) {
      return incomingRequestId;
    }

    return randomUUID();
  },
}).withTypeProvider<TypeBoxTypeProvider>();

fastify.setErrorHandler(errorHandler);

async function bootstrap() {
  const orderClient = new OrderClient(config.remoteOrderUrl);

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "Nike SCM Order Inventory API",
        description: "API documentation for the Nike SCM order and inventory gateway.",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });

  await fastify.register(rateLimit, {
    max: 2,
    timeWindow: "1 second",
  });

  await fastify.addHook("preHandler", authHook);

  await fastify.register(OrderRoutes, { prefix: "api", orderClient });
  await fastify.register(SystemRoutes, { prefix: "api" });

  try {
    await fastify.listen({ port: config.server.port, host: "0.0.0.0" });
    logger.info(`API gateway listening on ${config.server.port}`);
  } catch (error) {
    logger.error(error, "API gateway failed to start");
    process.exit(1);
  }
}

bootstrap();
