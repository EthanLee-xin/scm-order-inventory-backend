import { createClient, RedisClientType } from "redis";
import { config } from "../config/index.js";
import { logger } from "./logger.js";

export const redisClient: RedisClientType = createClient({
  url: config.redis.url,
});

redisClient.on("error", (err: Error) => {
  logger.error({ err }, "Redis client error");
});

await redisClient.connect();
logger.info("Redis client connected");
