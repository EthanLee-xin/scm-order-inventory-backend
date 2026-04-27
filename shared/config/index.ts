import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

function parseIntOrDefault(
  value: string | undefined,
  defaultValue: number,
  fieldName: string,
): number {
  if (value === undefined || value.trim().length === 0) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid ${fieldName} value: ${value}`);
  }

  return parsed;
}

function parseRequiredInt(
  value: string | undefined,
  fieldName: string,
): number {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid ${fieldName} value: ${value}`);
  }

  return parsed;
}

function parseOptionalString(value: string | undefined): string | undefined {
  if (value === undefined || value.trim().length === 0) {
    return undefined;
  }

  return value;
}

export interface AppConfig {
  postgres: {
    user?: string;
    host?: string;
    database?: string;
    password?: string;
    port: number;
  };
  redis: { url: string };
  rabbitmq: {
    url: string;
    exchanges: { order: string; dlx: string };
    queues: { order: string; dlq: string };
    routingKeys: { orderCreated: string; orderFailed: string };
  };
  jwtSecret: string;
  server: { port: number };
  deployMode: "monolith" | "microservice";
  remoteOrderUrl: string;
  snowflake: {
    machineId: number;
  };
}

export const config: AppConfig = {
  postgres: {
    user: parseOptionalString(process.env.PG_USER),
    host: parseOptionalString(process.env.PG_HOST),
    database: parseOptionalString(process.env.PG_DATABASE),
    password: parseOptionalString(process.env.PG_PASSWORD),
    port: parseIntOrDefault(process.env.PG_PORT, 5432, "PG_PORT"),
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || "amqp://localhost",
    exchanges: {
      order: "scm-nike.events",
      dlx: "scm-nike.dlx",
    },
    queues: {
      order: "scm-nike.queue.orders",
      dlq: "scm-nike.dlq.orders",
    },
    routingKeys: {
      orderCreated: "order.created",
      orderFailed: "order.failed",
    },
  },
  jwtSecret: process.env.JWT_SECRET || "",
  server: {
    port: parseIntOrDefault(process.env.PORT, 3000, "PORT"),
  },
  deployMode:
    process.env.DEPLOY_MODE === "microservice" ? "microservice" : "monolith",
  remoteOrderUrl: process.env.REMOTE_ORDER_URL || "http://localhost:3001",
  snowflake: {
    machineId: parseRequiredInt(
      process.env.SNOWFLAKE_MACHINE_ID,
      "SNOWFLAKE_MACHINE_ID",
    ),
  },
};
