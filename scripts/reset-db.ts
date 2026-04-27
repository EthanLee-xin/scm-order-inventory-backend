import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

async function resetDatabase(): Promise<void> {
  const pool = new Pool({
    host: process.env.PG_HOST || "localhost",
    port: parseInt(process.env.PG_PORT || "5432", 10),
    user: process.env.PG_USER || "postgres",
    password: process.env.PG_PASSWORD || "",
    database: process.env.PG_DATABASE || "postgres",
  });

  try {
    console.log("[reset-db] connecting to PostgreSQL...");

    const initSqlPath = path.resolve(process.cwd(), "database", "init.sql");
    const initSql = await fs.readFile(initSqlPath, "utf-8");

    console.log("[reset-db] clearing existing data...");

    await pool.query(`
      TRUNCATE TABLE
        processed_messages,
        outbox_events,
        orders,
        inventory
      RESTART IDENTITY CASCADE;
    `);

    console.log("[reset-db] re-applying schema and base seed...");

    await pool.query(initSql);

    console.log("[reset-db] database reset complete");
  } catch (error) {
    console.error("[reset-db] reset failed", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

resetDatabase();