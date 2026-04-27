import { redisClient } from "./redis.js";

export interface IdempotencyRecord<T = unknown> {
  statusCode: number;
  body: T;
}

export interface IdempotencyReservation {
  acquired: boolean;
  key: string;
}

const IDEMPOTENCY_PREFIX = "idempotency";
const IDEMPOTENCY_RESULT_TTL_SECONDS = 24 * 60 * 60;
const IDEMPOTENCY_LOCK_TTL_SECONDS = 60;

function buildResultKey(idempotencyKey: string) {
  return `${IDEMPOTENCY_PREFIX}:result:${idempotencyKey}`;
}

function buildLockKey(idempotencyKey: string) {
  return `${IDEMPOTENCY_PREFIX}:lock:${idempotencyKey}`;
}

export function getDefaultIdempotencyTtlSeconds() {
  return IDEMPOTENCY_RESULT_TTL_SECONDS;
}

export function getDefaultIdempotencyLockTtlSeconds() {
  return IDEMPOTENCY_LOCK_TTL_SECONDS;
}

export async function getCachedIdempotencyRecord<T>(
  idempotencyKey: string,
): Promise<IdempotencyRecord<T> | null> {
  const raw = await redisClient.get(buildResultKey(idempotencyKey));

  if (raw === null) {
    return null;
  }

  return JSON.parse(raw) as IdempotencyRecord<T>;
}

export async function reserveIdempotencyKey(
  idempotencyKey: string,
  lockTtlSeconds: number = IDEMPOTENCY_LOCK_TTL_SECONDS,
): Promise<IdempotencyReservation> {
  const lockKey = buildLockKey(idempotencyKey);

  const result = await redisClient.set(lockKey, "1", {
    NX: true,
    EX: lockTtlSeconds,
  });

  return {
    acquired: result === "OK",
    key: lockKey,
  };
}

export async function storeIdempotencyRecord<T>(
  idempotencyKey: string,
  record: IdempotencyRecord<T>,
  ttlSeconds: number = IDEMPOTENCY_RESULT_TTL_SECONDS,
) {
  await redisClient.set(buildResultKey(idempotencyKey), JSON.stringify(record), {
    EX: ttlSeconds,
  });

  await redisClient.del(buildLockKey(idempotencyKey));
}

export async function releaseIdempotencyReservation(idempotencyKey: string) {
  await redisClient.del(buildLockKey(idempotencyKey));
}

export async function hasIdempotencyRecord(idempotencyKey: string) {
  const value = await redisClient.get(buildResultKey(idempotencyKey));
  return value !== null;
}