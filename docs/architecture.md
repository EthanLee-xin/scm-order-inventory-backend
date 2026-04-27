# Architecture Overview

## 1. Purpose

This document describes the architecture of the Nike supply chain order and inventory platform from the perspective of the responsibilities implemented in this repository.

The repository covers the order intake path and the inventory processing path within a broader supply chain modernization program. The design emphasizes:

- high-concurrency request handling
- asynchronous processing
- inventory consistency
- service decoupling
- deployment flexibility

---

## 2. System Context

The platform is designed to support a distributed supply chain workflow in which incoming order requests must be validated quickly, accepted efficiently, and processed reliably under burst traffic.

In the wider business system, this repository represents only the order and inventory portion of the overall solution. Other supply chain domains such as logistics, warehouse operations, shipment tracking, and external partner integration are outside the scope of this codebase.

### Primary responsibilities in this repository

- receive order requests at the gateway layer
- validate user identity through JWT
- verify inventory availability using Redis and PostgreSQL
- publish order creation events to RabbitMQ
- consume order events asynchronously in the inventory worker
- persist inventory changes and order records in PostgreSQL

---

## 3. Architecture Style

The implementation follows a microservices-oriented architecture with a gateway-and-worker separation.

At the same time, the gateway contains a local execution path that can process orders directly in monolith mode. This provides a practical transition model for teams that may gradually split a monolithic order flow into independently deployable services.

### Architectural characteristics

- **Edge service pattern** for request handling
- **Async messaging pattern** for decoupling order placement from inventory processing
- **Cache-aside pattern** for stock retrieval
- **Transactional processing** for inventory updates
- **Dead-letter routing** for failed message handling

---

## 4. High-Level Component View

```text
Client / Upstream System
        |
        v
API Gateway (Fastify)
  - JWT authentication
  - rate limiting
  - Redis stock cache
  - PostgreSQL fallback
  - RabbitMQ event publishing
        |
        v
Inventory Worker
  - RabbitMQ consumer
  - PostgreSQL transaction
  - inventory deduction
  - order persistence
  - dead-letter handling

Shared Infrastructure
  - PostgreSQL
  - Redis
  - RabbitMQ
```

### Component summary

#### API Gateway
The API Gateway is the synchronous entry point for order requests. It protects the order API, performs stock validation, and emits order events.

#### Inventory Worker
The Inventory Worker is the asynchronous consumer that processes order-created events and applies inventory updates in the database.

#### Redis
Redis serves as a fast inventory lookup layer to reduce read pressure on PostgreSQL.

#### PostgreSQL
PostgreSQL is the persistence layer and the source of truth for inventory and order records.

#### RabbitMQ
RabbitMQ is the event backbone used to buffer and deliver order events between services.

---

## 5. Order Processing Flow

### 5.1 Request admission

1. A client sends a request to `POST /api/orders`.
2. The gateway checks whether the route requires authentication.
3. JWT is validated through the authentication hook.
4. Rate limiting is applied to protect the system from request bursts.

### 5.2 Stock validation

1. The gateway constructs a Redis key for the requested product.
2. Redis is used as the first stock lookup layer.
3. If the cache is missing or stale, PostgreSQL is queried for the latest stock.
4. PostgreSQL data is written back to Redis with a TTL.
5. If the resulting stock would be negative, the request is rejected and the cache is rolled back.

### 5.3 Event publication

1. A new order identifier is generated.
2. The order payload is converted into an event message.
3. The event is published to the RabbitMQ order exchange.
4. The API returns an acceptance response to the caller.

This means the API does not block on inventory persistence. Instead, it acknowledges the order as accepted for asynchronous processing.

---

## 6. Inventory Consumption Flow

### 6.1 Queue setup

When the inventory worker starts:

- the dead-letter queue is declared
- the main order queue is declared
- the queue is bound to the main order exchange
- the DLQ is bound to the dead-letter exchange
- dead-letter routing is configured for failed messages

### 6.2 Message consumption

1. The worker consumes order events from the queue.
2. The consumer uses `prefetch(1)` to limit concurrent message handling.
3. The message payload is parsed into an order event.
4. The inventory service passes the event to the repository layer.
5. The repository opens a PostgreSQL transaction.
6. Stock is decremented only if enough physical stock is available.
7. The order record is inserted in the same transaction.
8. The transaction is committed on success.
9. The message is acknowledged only after successful completion.

### 6.3 Failure handling

If processing fails:

- the transaction is rolled back
- the message is negatively acknowledged
- RabbitMQ routes the message to the dead-letter queue

This prevents silent loss and supports operational follow-up.

---

## 7. Data Flow

### Inventory read path

```text
API Gateway -> Redis -> PostgreSQL -> Redis
```

### Order event path

```text
API Gateway -> RabbitMQ -> Inventory Worker -> PostgreSQL
```

### Failure path

```text
Inventory Worker -> NACK -> RabbitMQ DLQ
```

---

## 8. Domain Boundaries

### Order Domain

The order domain includes:

- request validation
- authentication enforcement
- inventory availability checks
- order event creation
- message publication

### Inventory Domain

The inventory domain includes:

- queue consumption
- inventory update logic
- transactional persistence
- failure handling

### Shared Platform Layer

The shared layer includes:

- environment configuration
- infrastructure client initialization
- shared TypeScript interfaces

---

## 9. Deployment Modes

### 9.1 Monolith mode

In monolith mode, the gateway executes the order processing path locally.

Use case:

- fast local development
- single-node validation
- simplified debugging
- low-latency internal execution

### 9.2 Microservice mode

In microservice mode, the gateway forwards order creation to an external order service endpoint.

Use case:

- independent service deployment
- future service decomposition
- multi-team ownership
- production-like distributed topology

---

## 10. Non-Functional Design Goals

### Performance

- minimize request latency on the order path
- reduce PostgreSQL read load with Redis caching
- avoid synchronous downstream blocking

### Scalability

- support horizontal scaling of the gateway
- support separate scaling of the worker
- absorb traffic spikes through queue buffering

### Reliability

- preserve transactional consistency in PostgreSQL
- prevent message loss with DLQ routing
- avoid overselling through stock rollback behavior

### Maintainability

- keep shared logic in `packages/`
- separate responsibilities by service
- use TypeScript contracts across layers

### Operability

- support Docker Compose-based local orchestration
- allow clear runtime separation between services
- keep failure states observable through queue semantics

---

## 11. Key Design Decisions

### Redis as a cache-aside layer

Redis was chosen to accelerate inventory checks and reduce pressure on PostgreSQL.

### RabbitMQ for asynchronous orchestration

RabbitMQ was chosen to decouple order intake from inventory processing and to handle burst traffic more gracefully.

### PostgreSQL for source-of-truth persistence

PostgreSQL stores authoritative inventory and order data.

### Dead-letter queues for operational safety

A DLQ ensures failed inventory messages remain visible for investigation and compensation.

### Dual runtime strategy

The gateway supports both local and remote execution patterns so that the system can evolve gradually.

---

## 12. Current Limitations and Planned Extensions

This repository currently focuses on the order and inventory lifecycle. It does not yet include the rest of the Nike supply chain platform.

Planned extensions may include:

- standardized request tracing
- idempotency for repeated order submissions
- automated retries with backoff
- outbox pattern for stronger message consistency
- metrics and alerting
- database migration tooling
- additional order lifecycle APIs such as query, cancel, and status tracking

---

## 13. Summary

The architecture in this repository is intentionally centered on the order and inventory responsibility set that I owned in the larger supply chain initiative.

It demonstrates a practical enterprise backend design for high-concurrency order intake, asynchronous inventory processing, and distributed deployment readiness.