import { FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { Pool } from "pg";
import {
  metricsRegistry,
  getMetricsContent,
} from "../../../../shared/infrastructure/metrics.js";
import { sendSuccess, sendError } from "../../../../shared/http/response.js";

interface SystemRoutesOptions {
  pgPool: Pool;
}

const HealthResponseSchema = Type.Object({
  success: Type.Literal(true),
  data: Type.Object({
    status: Type.Literal("ok"),
    service: Type.String(),
    timestamp: Type.String(),
  }),
});

const ReadyResponseSchema = Type.Object({
  success: Type.Literal(true),
  data: Type.Object({
    status: Type.Literal("ready"),
    dependencies: Type.Array(
      Type.Object({
        name: Type.String(),
        status: Type.Union([Type.Literal("ok"), Type.Literal("failed")]),
      }),
    ),
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

export async function SystemRoutes(
  fastify: FastifyInstance,
  opts: SystemRoutesOptions,
) {
  const typedFastify = fastify.withTypeProvider<TypeBoxTypeProvider>();
  const { pgPool } = opts;

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
      return sendSuccess(
        reply,
        {
          status: "ok",
          service: "order-service",
          timestamp: new Date().toISOString(),
        },
        200,
      );
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
      const dependencies = [];
      try {
        await pgPool.query("SELECT 1");
        dependencies.push({ name: "postgres", status: "ok" as const });
      } catch (error) {
        fastify.log.error({ error }, "PostgreSQL readiness check failed");
        dependencies.push({ name: "postgres", status: "failed" as const });
      }
      const failed = dependencies.some((dep) => dep.status === "failed");
      if (failed) {
        return sendError(
          reply,
          "SERVICE_NOT_READY",
          "One or more dependencies are unavailable",
          503,
        );
      }
      return sendSuccess(
        reply,
        {
          status: "ready",
          dependencies,
        },
        200,
      );
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
