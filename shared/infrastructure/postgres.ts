import pg from "pg";
import { config } from "../config/index.js";
import { logger } from "./logger.js";

const { Pool } = pg;

export const pgPool: pg.Pool = new Pool(config.postgres);

pgPool.on("error", (err) => {
  logger.error({ err }, "PostgreSQL pool error");
});
