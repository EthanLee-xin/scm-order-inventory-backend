import { afterEach, vi } from "vitest";

process.env.JWT_SECRET ??= "test-secret";
process.env.DEPLOY_MODE ??= "monolith";
process.env.REMOTE_ORDER_URL ??= "http://localhost:4000";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.RABBITMQ_URL ??= "amqp://localhost";
process.env.PG_HOST ??= "localhost";
process.env.PG_PORT ??= "5432";
process.env.PG_USER ??= "postgres";
process.env.PG_PASSWORD ??= "postgres";
process.env.PG_DATABASE ??= "ecommerce";

afterEach(() => {
  vi.restoreAllMocks();
});
