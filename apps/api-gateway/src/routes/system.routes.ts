import { FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { pgPool } from "../../../../shared/infrastructure/postgres.js";
import { redisClient } from "../../../../shared/infrastructure/redis.js";
import { getMetricsContent, metricsRegistry } from "../../../../shared/infrastructure/metrics.js";

const HealthResponseSchema = Type.Object({
  success: Type.Literal(true),
  data: Type.Object({
    status: Type.Literal("ok"),
    service: Type.String(),
  }),
});

const ReadyResponseSchema = Type.Object({
  success: Type.Literal(true),
  data: Type.Object({
    status: Type.Literal("ready"),
  }),
});

const ErrorResponseSchema = Type.Object({
  success: Type.Literal(false),
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    details: Type.Optional(Type.Unknown()),
  }),
});

export async function SystemRoutes(fastify: FastifyInstance) {
  const typedFastify = fastify.withTypeProvider<TypeBoxTypeProvider>();

  typedFastify.get(
    "/health",
    {
      config: { isPublic: true },
      schema: {
        response: {
          200: HealthResponseSchema,
        },
      },
    },
    async (_, reply) => {
      return reply.code(200).send({
        success: true,
        data: {
          status: "ok",
          service: "api-gateway",
        },
      });
    },
  );

  typedFastify.get(
    "/ready",
    {
      config: { isPublic: true },
      schema: {
        response: {
          200: ReadyResponseSchema,
          503: ErrorResponseSchema,
        },
      },
    },
    async (_, reply) => {
      try {
        await pgPool.query("SELECT 1");
        await redisClient.ping();

        return reply.code(200).send({
          success: true,
          data: { status: "ready" },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(503).send({
          success: false,
          error: {
            code: "SERVICE_NOT_READY",
            message: "One or more dependencies are unavailable",
          },
        });
      }
    },
  );

  typedFastify.get(
    "/metrics",
    {
      config: { isPublic: true },
    },
    async (_, reply) => {
      reply.header("Content-Type", metricsRegistry.contentType);
      return reply.send(await getMetricsContent());
    },
  );
}
