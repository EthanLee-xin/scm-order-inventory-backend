// cspell:ignore typebox
import Fastify from "fastify";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Value } from "@sinclair/typebox/value";
import { Type } from "@sinclair/typebox";
import { SystemRoutes } from "../../apps/api-gateway/src/routes/system.routes.js";
import { ApiSuccessResponseSchema } from "../../shared/api-contracts/common.js";

const mocks = vi.hoisted(() => ({
  pgQueryMock: vi.fn(),
  redisPingMock: vi.fn(),
  getMetricsContentMock: vi.fn(),
}));

vi.mock("../../shared/infrastructure/postgres.js", () => ({
  pgPool: {
    query: mocks.pgQueryMock,
  },
}));

vi.mock("../../shared/infrastructure/redis.js", () => ({
  redisClient: {
    ping: mocks.redisPingMock,
  },
}));

vi.mock("../../shared/infrastructure/metrics.js", () => ({
  metricsRegistry: {
    contentType: "text/plain; version=0.0.4",
  },
  getMetricsContent: mocks.getMetricsContentMock,
}));

describe("system routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pgQueryMock.mockResolvedValue(undefined);
    mocks.redisPingMock.mockResolvedValue("PONG");
    mocks.getMetricsContentMock.mockResolvedValue("# metrics");
  });

  it("returns a health response that matches the contract", async () => {
    const app = Fastify();
    await app.register(SystemRoutes, { prefix: "/api" });

    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    const healthSchema = ApiSuccessResponseSchema(
      Type.Object({
        status: Type.Literal("ok"),
        service: Type.String(),
      }),
    );

    expect(Value.Check(healthSchema, body)).toBe(true);

    expect(body).toEqual({
      success: true,
      data: {
        status: "ok",
        service: "api-gateway",
      },
    });

    await app.close();
  });
});
