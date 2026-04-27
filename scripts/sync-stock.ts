// This code only used for Flash Sales to pre-warm Redis
import dotenv from "dotenv";
import pg from "pg";
import { createClient, RedisClientType } from "redis";

dotenv.config();

const pgPool: pg.Pool = new pg.Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});

const redisClient: RedisClientType = createClient({
  url: "redis://localhost:6379",
});

interface InventoryRow {
  product_id: string;
  physical_stock: number;
}

async function syncData(): Promise<void> {
  try {
    console.log("Cache pre-warming synchronize start.");

    await redisClient.connect();

    const { rows } = await pgPool.query<InventoryRow>(
      "SELECT product_id, physical_stock FROM inventory",
    );

    // Data synchronize to Redis
    for (const row of rows) {
      const stockKey = `stock:${row.product_id}`;
      await redisClient.set(stockKey, row.physical_stock.toString());
      console.log(`Synchronized ${stockKey} - stock: ${row.physical_stock}`);
    }

    console.log("Cache and Database Synchronized Complete!");
  } catch (error) {
    console.error("Synchronized Failure!", error);
  } finally {
    await pgPool.end();
    await redisClient.disconnect();
  }
}

syncData();
