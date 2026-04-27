# Deployment Guide

## 1. Purpose

This document describes how the Nike supply chain order and inventory platform in this repository is deployed in local and containerized environments, and what is still required before it can be treated as a production-grade deployment.

> **Scope note:** this repository covers the order and inventory portion of the broader supply chain modernization effort. The deployment guidance below applies only to the services and infrastructure included here.

---

## 2. Deployment Topology

The current system is organized into the following runtime components:

- `api-gateway` — external HTTP entry point
- `order-service` — internal order domain service
- `inventory-worker` — asynchronous inventory consumer
- `PostgreSQL` — durable application data
- `Redis` — idempotency and cache layer
- `RabbitMQ` — event transport layer

### Logical Flow

1. Client sends a request to the API Gateway.
2. API Gateway applies authentication, throttling, and idempotency protection.
3. API Gateway forwards the request to `order-service`.
4. `order-service` creates the order and writes an outbox event.
5. Outbox publisher sends the event to RabbitMQ.
6. `inventory-worker` consumes the event and updates inventory transactionally.

---

## 3. Deployment Modes

### 3.1 Local Source Execution

This mode is used for development and debugging.

Typical commands:

```bash
npm run dev:gateway
npm run dev:worker
```

This mode assumes the infrastructure services are already running.

---

### 3.2 Containerized Local Runtime

This mode is used to simulate production-like service startup and networking.

The repository provides `docker-compose.yml` for:

- PostgreSQL
- Redis
- RabbitMQ
- API Gateway
- Inventory Worker

The current setup is intentionally lightweight and is meant to validate service wiring, not full production orchestration.

---

### 3.3 Compiled Node.js Runtime

This mode is used for running the built application from `dist/`.

Typical commands:

```bash
npm run build
npm run start:gateway
npm run start:worker
```

This is the closest mode to a runtime deployment in the current repository.

---

## 4. Environment Preparation

Before starting any runtime, the following should be available:

- Node.js and npm
- Docker Desktop or Docker Engine
- `.env` file populated with required environment variables

### Required Environment Variables

Commonly used configuration values include:

- `PG_HOST`
- `PG_PORT`
- `PG_USER`
- `PG_PASSWORD`
- `PG_DATABASE`
- `REDIS_URL`
- `RABBITMQ_URL`
- `JWT_SECRET`
- `DEPLOY_MODE`
- `REMOTE_ORDER_URL`
- `SERVICE_NAME`
- `LOG_LEVEL`

---

## 5. Local Deployment Steps

### Step 1: Start Infrastructure

```bash
docker compose up -d
```

This starts:

- PostgreSQL
- Redis
- RabbitMQ

---

### Step 2: Prepare Data

Reset and seed the database if needed:

```bash
npm run db:prepare
```

This performs:

- database reset
- base inventory seed
- demo data load

---

### Step 3: Build the Application

```bash
npm run build
```

---

### Step 4: Start the Services

Run the API Gateway:

```bash
npm run start:gateway
```

Run the Inventory Worker:

```bash
npm run start:worker
```

If `order-service` is running as a separate service in your current branch, start it using the corresponding compiled entry point or source command for that service.

---

## 6. Container Deployment Notes

The repository currently supports a containerized runtime through `docker-compose.yml`.

### Current Container Services

- `scm-db`
- `scm-redis`
- `scm-mq`
- `api-gateway`
- `inventory-worker`

### What This Means

This is enough to simulate a distributed system locally, but it is not yet a production deployment platform.

### Important Considerations

- service startup ordering should be validated
- readiness should be checked before routing traffic
- persistent volumes should be backed up
- environment variables should be injected securely
- image versioning should be pinned for reproducibility

---

## 7. Recommended Production Deployment Shape

A production deployment should eventually include:

- separate environments for dev, staging, and prod
- CI/CD pipelines
- image tagging and promotion
- health and readiness probes
- centralized secrets management
- schema migration jobs
- observability integration
- rollback strategy
- alerting and incident response procedures

---

## 8. Service Readiness Expectations

### API Gateway

Should expose:

- `/health`
- `/ready`
- `/metrics`

Should be marked ready only when:

- its dependencies are reachable
- request handlers are registered
- it can accept traffic

---

### Order Service

Should expose:

- `/health`
- `/ready`
- `/metrics`

Should be marked ready only when:

- PostgreSQL is reachable
- RabbitMQ is reachable
- order service dependencies are initialized

---

### Inventory Worker

Should be started only after:

- PostgreSQL is reachable
- RabbitMQ is reachable

Worker readiness is primarily inferred from successful connection establishment and consumer registration.

---

## 9. Database Considerations

The repository currently uses a schema bootstrap file at:

- `database/init.sql`

This is suitable for local development and demo environments.

### Production Guidance

For production use, the schema layer should ideally be managed by:

- versioned migrations
- controlled rollout steps
- backward-compatible schema changes

### Data Safety

Before deploying to production, define:

- backup frequency
- restore procedure
- retention policy
- migration rollback plan

---

## 10. RabbitMQ Deployment Considerations

RabbitMQ is used for asynchronous order-event delivery.

### Current Behavior

- events are published with persistence enabled
- consumer failures are routed to a dead-letter queue
- inbox deduplication protects against duplicate consumption

### Production Hardening Suggestions

- define queue and exchange names centrally
- pin exchange durability settings
- document retry and dead-letter policies
- monitor queue depth and consumer lag

---

## 11. Redis Deployment Considerations

Redis is used for:

- API idempotency key deduplication
- fast stock cache lookups

### Production Hardening Suggestions

- decide on persistence strategy
- define eviction policy explicitly
- monitor memory usage and hit rate
- confirm TTLs are appropriate for business needs

---

## 12. Rollout Checklist

Before a release is considered healthy, verify:

- infrastructure containers are up
- database schema is applied
- seed/demo data is loaded if needed
- gateway starts cleanly
- order service starts cleanly
- worker starts cleanly
- `/health` returns success
- `/ready` returns success
- `/metrics` is scrapeable
- a sample order can traverse the full flow
- duplicate requests are handled idempotently
- duplicate messages are ignored by inbox deduplication

---

## 13. Current Gaps to Production Readiness

The repository is already structured like a real distributed system, but it still lacks some production deployment controls:

- CI/CD pipeline definitions
- Kubernetes manifests or Helm charts
- formal canary or blue-green deployment strategy
- secret rotation policy
- distributed tracing setup
- alerting rules and SLOs
- deployment rollback automation

---

## 14. Summary

This repository already supports local and containerized deployment patterns that resemble a real enterprise microservices system.

The current deployment story is strong enough for development, demos, and technical review. To reach full production-grade maturity, the next step is to add automated environment promotion, deployment controls, and operational guardrails.