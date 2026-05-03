import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import Fastify from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import swagger from "@fastify/swagger";
import { randomUUID } from "node:crypto";
import rateLimit from "@fastify/rate-limit";
import { config } from "../shared/config/index.js";
import { logger } from "../shared/infrastructure/logger.js";
import { authHook } from "../apps/api-gateway/src/plugins/auth.js";
import { errorHandler } from "../apps/api-gateway/src/plugins/error-handler.js";
import { OrderClient } from "../apps/api-gateway/src/clients/order.client.js";
import { OrderRoutes } from "../apps/api-gateway/src/routes/order.routes.js";
import { SystemRoutes } from "../apps/api-gateway/src/routes/system.routes.js";

async function main() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
    },
    requestIdHeader: "x-request-id",
    genReqId: (request) => {
      const incomingRequestId = request.headers["x-request-id"];
      if (typeof incomingRequestId === "string" && incomingRequestId.length > 0) {
        return incomingRequestId;
      }

      return randomUUID();
    },
  }).withTypeProvider<TypeBoxTypeProvider>();

  app.setErrorHandler(errorHandler);

  await app.register(swagger, {
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

  await app.register(rateLimit, {
    max: 2,
    timeWindow: "1 second",
  });

  await app.addHook("preHandler", authHook);
  const orderClient = new OrderClient(config.remoteOrderUrl);
  await app.register(OrderRoutes, { prefix: "api", orderClient });
  await app.register(SystemRoutes, { prefix: "api" });

  await app.ready();

  const spec = app.swagger();
  const outputPath = resolve("openapi.json");
  await writeFile(outputPath, JSON.stringify(spec, null, 2), "utf8");

  logger.info({ outputPath }, "OpenAPI spec exported");
  await app.close();
}

main().catch((error) => {
  logger.error(error, "Failed to export OpenAPI spec");
  process.exit(1);
});
