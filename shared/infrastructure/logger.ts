import pino from "pino";

const serviceName = process.env.SERVICE_NAME || "microservices-ecommerce-distributed";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: {
    serviceName,
    env: process.env.NODE_ENV || "development",
  },
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            singleLine: true,
          },
        }
      : undefined,
});
