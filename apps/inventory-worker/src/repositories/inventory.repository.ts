import { Pool, PoolClient } from "pg";
import { OrderCreatedEvent } from "../../../../shared/types/index.js";
import { pgTransactionResultsTotal } from "../../../../shared/infrastructure/metrics.js";
import { OrderStatus } from "../../../../shared/types/index.js";

export class InventoryRepository {
  private pool: Pool;

  constructor(dbPool: Pool) {
    this.pool = dbPool;
  }

  async executeOrderTransaction(
    orderEvent: OrderCreatedEvent,
    nextStatus: OrderStatus,
  ): Promise<number> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const updateStockQuery = `
            UPDATE inventory
            SET physical_stock = physical_stock - $1
            WHERE product_id = $2 AND physical_stock >= $1
            RETURNING physical_stock;
        `;

      const stockResult = await client.query(updateStockQuery, [
        orderEvent.quantity,
        orderEvent.productId,
      ]);

      if (stockResult.rowCount === 0) {
        throw new Error("Inventory update failed");
      }

      const insertOrderQuery = `
            INSERT INTO orders 
            (order_id, user_id, product_id, quantity, status)
            VALUES ($1, $2, $3, $4, $5)
        `;
      await client.query(insertOrderQuery, [
        orderEvent.orderId,
        orderEvent.userId,
        orderEvent.productId,
        orderEvent.quantity,
        nextStatus,
      ]);

      await client.query("COMMIT");

      pgTransactionResultsTotal.inc({ status: "commit" });
      
      return stockResult.rows[0].physical_stock;
    } catch (error) {
      await client.query("ROLLBACK");
      pgTransactionResultsTotal.inc({ status: "rollback" });
      throw error;
    } finally {
      client.release();
    }
  }
}
