import { Pool } from "pg";

export interface CreateOutboxEventInput {
  eventId: string;
  eventType: string;
  aggregateId: string;
  payload: unknown;
}

export interface OutboxRow {
  id: number;
  event_id: string;
  event_type: string;
  aggregate_id: string;
  payload: Record<string, unknown>;
  status: "PENDING" | "PUBLISHED" | "FAILED";
  retry_count: number;
  last_error: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export class OutboxRepository {
  constructor(private pool: Pool) {}

  async createEvent(input: CreateOutboxEventInput): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO outbox_events (
        event_id,
        event_type,
        aggregate_id,
        payload,
        status
      ) VALUES ($1, $2, $3, $4, 'PENDING')
      `,
      [
        input.eventId,
        input.eventType,
        input.aggregateId,
        JSON.stringify(input.payload),
      ],
    );
  }

  async fetchPendingEvents(limit = 50): Promise<OutboxRow[]> {
    const result = await this.pool.query(
      `
      SELECT *
      FROM outbox_events
      WHERE status = 'PENDING'
      ORDER BY created_at ASC
      LIMIT $1
      `,
      [limit],
    );

    return result.rows as OutboxRow[];
  }

  async markPublished(eventId: string): Promise<void> {
    await this.pool.query(
      `
      UPDATE outbox_events
      SET status = 'PUBLISHED',
          published_at = NOW(),
          updated_at = NOW(),
          last_error = NULL
      WHERE event_id = $1
      `,
      [eventId],
    );
  }

  async markFailed(eventId: string, errorMessage: string): Promise<void> {
    await this.pool.query(
      `
      UPDATE outbox_events
      SET status = 'FAILED',
          retry_count = retry_count + 1,
          last_error = $2,
          updated_at = NOW()
      WHERE event_id = $1
      `,
      [eventId, errorMessage],
    );
  }
}
