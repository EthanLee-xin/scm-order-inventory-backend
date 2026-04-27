# ADR 0001: Use Redis as a Fast Inventory Cache

## Status

Accepted

---

## Context

The order intake path needs to validate stock quickly under burst traffic.

Directly querying PostgreSQL for every request would increase latency and create unnecessary pressure on the database, especially when the same inventory items are frequently requested.

The system therefore needs a fast read layer for stock checks.

---

## Decision

Use Redis as the first-level inventory lookup layer.

The gateway checks Redis before querying PostgreSQL. If the key is missing, the gateway loads the value from PostgreSQL and writes it back to Redis with a TTL.

---

## Alternatives Considered

### 1. Query PostgreSQL directly for every order request

**Rejected** because it would:

- increase response latency
- place higher load on the source-of-truth database
- reduce throughput under high concurrency

### 2. Use Redis only as a write-through store without fallback

**Rejected** because Redis cannot be treated as the source of truth in this domain. Inventory data must remain durable in PostgreSQL.

### 3. Use a local in-memory cache inside the gateway

**Rejected** because it would not scale across multiple instances and would create cache inconsistency between nodes.

---

## Consequences

### Positive

- lower order-path latency
- reduced read pressure on PostgreSQL
- better throughput during peak traffic
- cache-aside behavior is easy to reason about

### Negative

- cache invalidation and consistency must be managed carefully
- Redis and PostgreSQL may briefly diverge if not handled correctly
- the system still needs a database fallback for correctness

---

## Notes

This decision is appropriate for high-read inventory validation scenarios, but it requires careful handling of oversell prevention and rollback behavior.