import { Pool, PoolClient } from "pg";
import { OrderStatus } from "../../../../shared/types/order-status.js";
import { logger } from "../../../../shared/infrastructure/logger.js";

export interface CreateOrderRecord {
  orderId: string;
  userId: string;
  productId: string;
  quantity: number;
  status: OrderStatus;
}

export class OrderRepository {
  constructor(private pool: Pool) {}

  async createOrder(input: CreateOrderRecord): Promise<void> {
    const client: PoolClient = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const insertOrderQuery = `
        INSERT INTO orders (
          order_id,
          user_id,
          product_id,
          quantity,
          status
        ) VALUES ($1, $2, $3, $4, $5)
      `;

      await client.query(insertOrderQuery, [
        input.orderId,
        input.userId,
        input.productId,
        input.quantity,
        input.status,
      ]);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error({ error, orderId: input.orderId }, "Failed to create order");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    await this.pool.query(
      `
      UPDATE orders
      SET status = $2
      WHERE order_id = $1
      `,
      [orderId, status],
    );
  }

  async findOrderById(orderId: string) {
    const result = await this.pool.query(
      `
      SELECT order_id, user_id, product_id, quantity, status
      FROM orders
      WHERE order_id = $1
      `,
      [orderId],
    );

    return result.rows[0] ?? null;
  }
}
