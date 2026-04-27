# Operations Guide

## 1. Purpose

This document describes the operational behavior of the Nike supply chain order and inventory platform represented in this repository.

It is intended for developers, maintainers, and reviewers who need to understand how to run the system locally, how the services behave at runtime, and what operational concerns should be considered when moving toward a production deployment.

> **Scope note:** this repository covers the order and inventory portion of the broader supply chain modernization effort. Operational guidance below applies only to the services included here.

---

## 2. Runtime Components

### API Gateway

The API Gateway is the HTTP entry point for order submission.

Responsibilities:

- authenticate incoming requests using JWT
- apply request throttling
- validate stock using Redis with PostgreSQL fallback
- publish order events to RabbitMQ
- return immediate acceptance responses

### Inventory Worker

The Inventory Worker processes order events asynchronously.

Responsibilities:

- consume order-created events from RabbitMQ
- apply inventory deductions in PostgreSQL
- persist order records in the same transaction
- acknowledge successful messages
- route failed messages into a dead-letter queue

### Supporting Infrastructure

- **PostgreSQL**: source of truth for inventory and order records
- **Redis**: fast inventory lookup and cache-aside acceleration
- **RabbitMQ**: event transport for asynchronous order processing

---

## 3. Environments

The codebase is designed to run in the following execution modes:

### Local Development

Used for feature development, debugging, and flow verification.

Typical characteristics:

- services can run directly from source with `tsx`
- infrastructure is started with Docker Compose
- runtime logs are visible in the terminal

### Containerized Local Runtime

Used to simulate service startup and networking behavior more closely.

Typical characteristics:

- application services run from compiled output
- PostgreSQL, Redis, and RabbitMQ are provided by Docker Compose
- environment variables are injected through `.env`

### Planned Production Separation

The repository already reflects the shape of a distributed system, but a full production environment would typically introduce:

- separate `dev`, `staging`, and `prod` deployments
- formal release gates
- health checks and alerting
- secrets management
- observability tooling

---

## 4. Startup Sequence

### 4.1 Start Infrastructure

Start the local dependencies first:

```bash
docker compose up -d
```

This starts:

- PostgreSQL
- Redis
- RabbitMQ

### 4.2 Build the Application

Compile the TypeScript sources:

```bash
npm run build
```

### 4.3 Start the API Gateway

```bash
npm run start:gateway
```

### 4.4 Start the Inventory Worker

```bash
npm run start:worker
```

---

## 5. Development Workflow

### Gateway Development Mode

Run the gateway directly from source:

```bash
npm run dev:gateway
```

### Worker Development Mode

Run the worker directly from source:

```bash
npx tsx services/inventory-worker/src/worker.ts
```

### Recommended Local Validation Flow

1. start infrastructure
2. verify environment variables
3. run the gateway in development mode
4. run the worker in development mode
5. submit a sample order request
6. confirm queue consumption and database updates

---

## 6. Configuration Management

The application reads configuration from environment variables.

Primary settings include:

- `PG_USER`
- `PG_PASSWORD`
- `PG_DATABASE`
- `PG_PORT`
- `PG_HOST`
- `REDIS_URL`
- `RABBITMQ_URL`
- `JWT_SECRET`
- `DEPLOY_MODE`
- `REMOTE_ORDER_URL`

### Important Runtime Notes

- `PG_HOST=localhost` is appropriate for local execution outside Docker.
- In Docker Compose, services use the container hostname, such as `scm-db`.
- `DEPLOY_MODE=monolith` uses the local order service implementation.
- `DEPLOY_MODE=microservice` forwards requests to an external endpoint configured by `REMOTE_ORDER_URL`.

---

## 7. Logging Behavior

The current implementation relies primarily on console output and Fastify logging.

Observed runtime logs include:

- gateway boot logs
- worker boot logs
- cache miss and synchronization messages
- transaction begin / commit messages
- error stack traces on startup failure

### Operational Implication

This is sufficient for local debugging, but a production environment should replace or augment it with:

- structured logs
- request identifiers
- correlation between API calls and worker processing
- centralized log collection

---

## 8. Failure Handling

### Gateway Startup Failure

If the gateway cannot connect to its dependencies or cannot listen on the configured port, the process logs the error and exits with code `1`.

### Worker Startup Failure

If the worker fails during initialization, the process logs the error and exits with code `1`.

### Message Processing Failure

If the worker cannot process a message successfully:

- the message is negatively acknowledged
- RabbitMQ routes it to the dead-letter queue
- the message is retained for operational follow-up

### Inventory Rejection

If inventory is insufficient at processing time:

- the database transaction is rolled back
- the order event is not treated as successfully completed
- the failure path can be inspected through worker logs and DLQ handling

---

## 9. Queue and Dead-Letter Behavior

The worker configures the following RabbitMQ resources:

- a normal order queue
- a dead-letter queue
- the main exchange for order-created events
- a dead-letter exchange for rejected messages

### Processing Behavior

- messages are consumed with `prefetch(1)`
- successful processing results in `ack`
- failures result in `nack` with requeue disabled
- failed messages are routed to the DLQ

### Operational Implication

This pattern limits the blast radius of failures and makes it easier to inspect unprocessed messages without losing data.

---

## 10. Data Consistency Notes

### Redis

Redis acts as a performance layer and may hold cached stock values.

Operational considerations:

- cache data should be treated as ephemeral
- PostgreSQL remains the source of truth
- cache entries are refreshed on miss using a TTL

### PostgreSQL

PostgreSQL holds the durable inventory and order state.

Operational considerations:

- inventory deduction and order persistence are handled transactionally
- schema changes should eventually be managed through migrations
- backups and restore procedures should be defined before production use

### RabbitMQ

RabbitMQ carries order events between services.

Operational considerations:

- queue durability and dead-letter routing are used to improve reliability
- message duplication and retry behavior should be considered in future hardening
- consumer throughput is intentionally limited for controlled processing

---

## 11. Deployment Notes

### Current Deployment Shape

The repository supports the following deployment patterns:

- source execution for development
- compiled Node.js execution for runtime containers
- Docker Compose for local infrastructure orchestration

### Container Runtime

The current `docker-compose.yml` defines:

- `scm-db`
- `scm-redis`
- `scm-mq`
- `api-gateway`
- `inventory-worker`

### Recommended Production Deployment Enhancements

Before production deployment, the system should add:

- health and readiness probes
- metrics endpoint
- liveness checks
- secret injection mechanism
- managed database migrations
- deployment rollback strategy

---

## 12. Smoke Test Checklist

A basic post-start smoke test should confirm the following:

- all infrastructure containers are running
- gateway starts successfully
- worker starts successfully
- JWT-protected route rejects missing tokens
- stock validation can read Redis or fall back to PostgreSQL
- an order request produces a RabbitMQ event
- the worker consumes the event and updates the database
- failed messages are visible in the DLQ path

---

## 13. Known Operational Gaps

The current implementation intentionally stays focused on the business path and does not yet include all production-grade operations features.

Missing or future improvements include:

- health endpoints
- readiness probes
- distributed tracing
- structured log aggregation
- automated alerting
- replay tooling for dead-letter messages
- admin operations APIs
- backup and restore runbooks

---

## 14. Summary

This repository already reflects a realistic operational shape for a distributed commerce system:

- a request-facing gateway
- an asynchronous worker
- cache-assisted stock validation
- transactional inventory processing
- queue-based failure isolation

The remaining work for full production readiness is primarily around observability, deployment governance, and operational tooling.