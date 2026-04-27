import pg from "pg";
import { createClient } from "redis";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

async function setupInfrastructure() {
  console.log("Starting Database & Cache...\n");

  // 1. Initialize PostgreSQL connection
  const pgPool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
  });

  // 2. Initialize Redis connection
  const redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.on("error", (err) => {
    console.log("Redis Client Error", err);
  });
  await redisClient.connect();

  try {
    // PostgreSQL Table build
    console.log("[PostgreSQL] Executing table creation script...\n");
    const sqlScript = fs.readFileSync("./database/init.sql", "utf8");
    await pgPool.query(sqlScript);
    console.log("[PostgreSQL] Table created successfully");

    // Redis pre-warming
    const prodcutId = "PROD_IPHONE_15";
    const totalStock = 100;

    await redisClient.set(`stock:${prodcutId}`, totalStock);
    console.log(
      `[Redis] Pre-warming cache, Product ${prodcutId} stock set to ${totalStock}`,
    );

    console.log("\n Data Infrastructure is ready.");
  } catch (error) {
    console.error("Setup Error: ", error.message);
  } finally {
    await pgPool.end();
    await redisClient.quit();
    process.exit(0);
  }
}

setupInfrastructure();
