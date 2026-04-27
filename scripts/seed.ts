import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

interface SeedInventoryRow {
  product_id: string;
  product_name: string;
  physical_stock: number;
}

const seedInventoryRows: SeedInventoryRow[] = [
  {
    product_id: "PROD_IPHONE_15",
    product_name: "iPhone 15 Pro Max",
    physical_stock: 100,
  },
  {
    product_id: "PROD_AIRPODS_PRO",
    product_name: "AirPods Pro",
    physical_stock: 200,
  },
  {
    product_id: "PROD_MACBOOK_PRO",
    product_name: "MacBook Pro 14",
    physical_stock: 50,
  },
];

async function seedDatabase(): Promise<void> {
  const pool = new Pool({
    host: process.env.PG_HOST || "localhost",
    port: parseInt(process.env.PG_PORT || "5432", 10),
    user: process.env.PG_USER || "postgres",
    password: process.env.PG_PASSWORD || "",
    database: process.env.PG_DATABASE || "postgres",
  });

  try {
    console.log("[seed] inserting demo inventory data...");

    for (const row of seedInventoryRows) {
      await pool.query(
        `
        INSERT INTO inventory (product_id, product_name, physical_stock)
        VALUES ($1, $2, $3)
        ON CONFLICT (product_id) DO UPDATE
        SET product_name = EXCLUDED.product_name,
            physical_stock = EXCLUDED.physical_stock
        `,
        [row.product_id, row.product_name, row.physical_stock],
      );
    }

    console.log("[seed] seed complete");
  } catch (error) {
    console.error("[seed] seed failed", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seedDatabase();