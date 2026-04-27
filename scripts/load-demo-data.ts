import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

interface DemoInventoryRow {
  product_id: string;
  product_name: string;
  physical_stock: number;
}

interface DemoOrderRow {
  order_id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  status: string;
}

const demoInventoryRows: DemoInventoryRow[] = [
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
  {
    product_id: "PROD_APPLE_WATCH",
    product_name: "Apple Watch Ultra",
    physical_stock: 80,
  },
];

const demoOrderRows: DemoOrderRow[] = [
  {
    order_id: "ORD_DEMO_1001",
    user_id: "USER_DEMO_1",
    product_id: "PROD_IPHONE_15",
    quantity: 2,
    status: "PAID",
  },
  {
    order_id: "ORD_DEMO_1002",
    user_id: "USER_DEMO_2",
    product_id: "PROD_AIRPODS_PRO",
    quantity: 1,
    status: "PROCESSING",
  },
];

async function loadDemoData(): Promise<void> {
  const pool = new Pool({
    host: process.env.PG_HOST || "localhost",
    port: parseInt(process.env.PG_PORT || "5432", 10),
    user: process.env.PG_USER || "postgres",
    password: process.env.PG_PASSWORD || "",
    database: process.env.PG_DATABASE || "postgres",
  });

  try {
    console.log("[demo-data] loading demo inventory...");

    for (const row of demoInventoryRows) {
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

    console.log("[demo-data] loading demo orders...");

    for (const row of demoOrderRows) {
      await pool.query(
        `
        INSERT INTO orders (
          order_id, user_id, product_id, quantity, status
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (order_id) DO UPDATE
        SET user_id = EXCLUDED.user_id,
            product_id = EXCLUDED.product_id,
            quantity = EXCLUDED.quantity,
            status = EXCLUDED.status
        `,
        [
          row.order_id,
          row.user_id,
          row.product_id,
          row.quantity,
          row.status,
        ],
      );
    }

    console.log("[demo-data] demo data loaded successfully");
  } catch (error) {
    console.error("[demo-data] failed to load demo data", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

loadDemoData();