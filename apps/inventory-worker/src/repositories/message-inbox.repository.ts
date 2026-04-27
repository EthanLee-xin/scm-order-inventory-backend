import { Pool } from "pg";

export class MessageInboxRepository {
  constructor(private pool: Pool) {}

  async reserveMessage(messageId: string, orderId: string): Promise<boolean> {
    const result = await this.pool.query(
      `
        INSERT INTO processed_messages(message_id, order_id, status)
        VALUES ($1, $2, 'PROCESSING')
        ON CONFLICT (message_id) DO NOTHING
        `,
      [messageId, orderId],
    );

    return (result.rowCount ?? 0) > 0;
  }

  async markMessageProcessed(messageId: string): Promise<void> {
    await this.pool.query(
      `
      UPDATE processed_messages
      SET status = 'PROCESSED',
          processed_at = NOW(),
          updated_at = NOW(),
          error_message = NULL
      WHERE message_id = $1
        `,
      [messageId],
    );
  }

  async markMessageFailed(
    messageId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.pool.query(
      `
      UPDATE processed_messages
      SET status = 'FAILED',
          error_message = $2,
          updated_at = NOW()
      WHERE message_id = $1
      `,
      [messageId, errorMessage],
    );
  }
}
