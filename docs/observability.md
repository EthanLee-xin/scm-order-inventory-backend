# Observability Guide

## 1. Purpose

This document describes the minimal observability layer implemented for the Nike supply chain order and inventory platform represented in this repository.

The goal is to provide a production-like baseline for service health checks, readiness checks, and Prometheus-compatible metrics without introducing a full distributed tracing stack at this stage.

> **Scope note:** this repository covers only the order and inventory portion of the broader supply chain modernization effort.

---

## 2. Observability Goals

The observability layer is designed to answer three operational questions:

1. **Is the service alive?**
2. **Is the service ready to receive traffic?**
3. **What is the system doing under load?**

To support these questions, the repository exposes:

- `GET /health`
- `GET /ready`
- `GET /metrics`

And collects the following business metrics:

- order request volume
- order success volume
- out-of-stock rejection volume
- Redis cache hit rate
- Redis cache miss rate
- PostgreSQL transaction commit / rollback counts

---

## 3. Implementation Map

This section maps each observability responsibility to the file that owns it.

### `apps/api-gateway/src/server.ts`

Owns the API Gateway bootstrap and the registration of observability routes.

Responsibilities:
- configure Fastify logger with request ID support
- register rate limiting
- register `authHook`
- register `OrderRoutes`
- register `SystemRoutes`
- start the HTTP listener

### `apps/api-gateway/src/routes/system.routes.ts`

Owns the observability endpoints.

Responsibilities:
- expose `GET /health`
- expose `GET /ready`
- expose `GET /metrics`
- perform dependency readiness checks
- serialize health and readiness responses using the standard envelope

### `apps/api-gateway/src/services/order.service.ts`

Owns the order request flow and business metrics for order intake.

Responsibilities:
- increment order request counter
- increment Redis hit / miss counters
- increment success and out-of-stock counters
- emit request-scoped logs when cache misses occur

### `apps/inventory-worker/src/repositories/inventory.repository.ts`

Owns the PostgreSQL transaction outcome metric for inventory processing.

Responsibilities:
- increment PostgreSQL transaction commit counter
- increment PostgreSQL transaction rollback counter

### `shared/infrastructure/metrics.ts`

Owns the Prometheus registry and metric definitions.

Responsibilities:
- create the Prometheus registry
- register default Node.js metrics
- define counters used by the gateway and worker
- export metrics text for scraping

### `shared/infrastructure/redis.ts`

Owns Redis connectivity and startup logging.

Responsibilities:
- create the Redis client
- connect on bootstrap
- emit connection and error logs

### `shared/infrastructure/postgres.ts`

Owns PostgreSQL pool creation and pool error logging.

Responsibilities:
- create the PostgreSQL pool
- emit pool error logs

### `shared/infrastructure/logger.ts`

Owns the structured logger.

Responsibilities:
- configure Pino
- attach `serviceName`
- attach environment metadata
- enable pretty output in non-production environments

---

## 4. HTTP Endpoints

### 4.1 `GET /health`

#### Purpose
A lightweight liveness endpoint used to confirm that the API process is running.

#### Behavior
- does not perform dependency checks
- should return quickly
- is suitable for container liveness probes

#### Typical response

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "api-gateway"
  }
}
```

#### Operational meaning
If `/health` fails, the process is likely down or not accepting requests.

---

### 4.2 `GET /ready`

#### Purpose
A readiness endpoint used to confirm that critical dependencies are available before traffic is routed to the service.

#### What it checks in the current code
The current minimal implementation checks:

- PostgreSQL connectivity via `pgPool.query("SELECT 1")`
- Redis connectivity via `redisClient.ping()`

If one of these calls fails, the endpoint returns `503`.

#### Typical response

```json
{
  "success": true,
  "data": {
    "status": "ready"
  }
}
```

#### Failure response

```json
{
  "success": false,
  "error": {
    "code": "SERVICE_NOT_READY",
    "message": "One or more dependencies are unavailable"
  }
}
```

#### Operational meaning
If `/ready` fails, the process may be alive but should not receive traffic.

---

### 4.3 `GET /metrics`

#### Purpose
Expose Prometheus-format metrics for scraping by a monitoring system.

#### Behavior
- returns the Prometheus exposition format
- is intended to be scraped by Prometheus
- should remain lightweight

#### Response content type
The endpoint returns the registry content type provided by `prom-client`.

#### Operational meaning
This endpoint allows dashboards, alerts, and SLO calculations to be built on top of the runtime telemetry.

---

## 5. Metrics Catalog

### 5.1 `ecommerce_order_requests_total`

#### Type
Counter

#### Meaning
Total number of order requests entering the order service.

#### Where it is incremented
- `apps/api-gateway/src/services/order.service.ts`
- inside `processOrder()` at the start of the method

#### How it is used
This metric is the denominator for order success rate and out-of-stock rate calculations.

---

### 5.2 `ecommerce_order_success_total`

#### Type
Counter

#### Meaning
Total number of orders that were successfully accepted and published to RabbitMQ.

#### Where it is incremented
- `apps/api-gateway/src/services/order.service.ts`
- inside `processOrder()` after `mq.publish(...)`

#### How it is used
This metric is the numerator for order success rate calculations.

---

### 5.3 `ecommerce_order_out_of_stock_total`

#### Type
Counter

#### Meaning
Total number of order requests rejected because stock was insufficient.

#### Where it is incremented
- `apps/api-gateway/src/services/order.service.ts`
- inside the `currentStock < 0` branch before throwing `OutOfStockError`

#### How it is used
This metric is the numerator for out-of-stock rate calculations.

---

### 5.4 `ecommerce_redis_cache_hits_total`

#### Type
Counter

#### Meaning
Total number of times the inventory lookup was satisfied directly by Redis.

#### Where it is incremented
- `apps/api-gateway/src/services/order.service.ts`
- inside the cache-hit branch when `decrBy()` returns a non-null value

#### How it is used
This metric is the numerator for Redis hit rate.

---

### 5.5 `ecommerce_redis_cache_misses_total`

#### Type
Counter

#### Meaning
Total number of times the inventory lookup missed Redis and had to fall back to PostgreSQL.

#### Where it is incremented
- `apps/api-gateway/src/services/order.service.ts`
- inside the `currentStock === null` branch before querying PostgreSQL

#### How it is used
This metric is the denominator component for Redis hit rate.

---

### 5.6 `ecommerce_pg_transaction_results_total`

#### Type
Counter

#### Labels
- `status=commit`
- `status=rollback`

#### Meaning
Tracks the outcome of PostgreSQL inventory transactions.

#### Where it is incremented
- `apps/inventory-worker/src/repositories/inventory.repository.ts`
- `status=commit` is recorded after `COMMIT`
- `status=rollback` is recorded inside the `catch` block after `ROLLBACK`

#### How it is used
This metric provides basic visibility into whether inventory updates are succeeding or rolling back.

---

## 6. Key Ratio Definitions

### 6.1 Order Success Rate

Formula:

\[
\text{Order Success Rate} = \frac{\text{ecommerce\_order\_success\_total}}{\text{ecommerce\_order\_requests\_total}}
\]

#### Interpretation
Shows how many order requests complete successfully.

---

### 6.2 Out-of-Stock Rate

Formula:

\[
\text{Out-of-Stock Rate} = \frac{\text{ecommerce\_order\_out\_of\_stock\_total}}{\text{ecommerce\_order\_requests\_total}}
\]

#### Interpretation
Shows how often the system rejects requests because inventory is insufficient.

---

### 6.3 Redis Hit Rate

Formula:

\[
\text{Redis Hit Rate} = \frac{\text{ecommerce\_redis\_cache\_hits\_total}}{\text{ecommerce\_redis\_cache\_hits\_total} + \text{ecommerce\_redis\_cache\_misses\_total}}
\]

#### Interpretation
Shows how often the inventory lookup is satisfied by Redis instead of falling back to PostgreSQL.

---

## 7. Minimal Operational Interpretation

### Healthy service
A healthy service should satisfy all of the following:

- `/health` returns success
- `/ready` returns success
- `/metrics` is scrapeable
- order requests increment metrics as expected

### Warning signals
The following signs should trigger investigation:

- rising out-of-stock rate
- low Redis hit rate
- high PostgreSQL rollback count
- `/ready` failing while `/health` remains green

### Suggested response actions
- check inventory synchronization
- inspect Redis cache warm-up behavior
- inspect PostgreSQL connectivity and transaction failures
- inspect RabbitMQ queue pressure and consumer throughput

---

## 8. Current Scope and Limitations

This is intentionally a minimal observability layer.

It does **not** yet include:

- distributed tracing with OpenTelemetry
- per-route latency histograms
- worker-side exposed metrics endpoint
- structured business event dashboards
- alert routing and on-call escalation policies

These can be added later without changing the overall observability shape.

---

## 9. Summary

The repository now has a lightweight but production-shaped observability baseline:

- liveness via `/health`
- readiness via `/ready`
- telemetry via `/metrics`
- business metrics for order success, out-of-stock rejection, Redis cache behavior, and PostgreSQL transaction outcomes

This is sufficient for a realistic enterprise demo and provides a strong foundation for future tracing and alerting enhancements.