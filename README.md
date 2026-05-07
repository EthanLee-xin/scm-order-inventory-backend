# SCM Order & Inventory Backend

## Overview

Production-style supply chain order and inventory backend with Redis idempotency, RabbitMQ, Outbox / Inbox patterns, DLQ handling, PostgreSQL transactions, Docker, OpenAPI documentation, GitHub Actions CI/CD, and AWS cloud deployment using ECS Fargate, ALB, RDS, ElastiCache, and ECR.

> **Scope note:** This repository is a production-style personal reconstruction based on commercial supply chain backend patterns. It focuses on the order and inventory modules only and does not contain proprietary company code, confidential data, or client-specific implementation details.

The system is designed to support high-concurrency order intake, fast inventory validation, asynchronous order processing, and containerized local execution. The implementation focuses on request handling, idempotency, stock checking, event publishing, inventory consumption, and failure isolation.

The platform is implemented with **Node.js**, **TypeScript**, **Fastify**, **Redis**, **RabbitMQ**, and **PostgreSQL**, and follows a **service-oriented backend architecture** with an API gateway, order service, and inventory worker.

---

## What this project demonstrates

- API gateway design for order intake
- Redis-based idempotency for duplicate order submissions
- RabbitMQ-based asynchronous inventory processing
- Outbox / Inbox patterns for safer event publication and consumption
- PostgreSQL transactions for stock consistency
- DLQ handling for failed inventory messages
- Docker-based local development and verification
- Contract-first API documentation with OpenAPI / Swagger
- GitHub Actions CI for build, test, OpenAPI export, and Docker image workflows
- AWS cloud deployment using ECS Fargate, ALB, RDS PostgreSQL, ElastiCache Redis, and ECR
- VPC-based three-tier network design with public, private application, and private data subnets
- GitHub Actions deployment workflow for Docker image publishing and ECS rolling updates

## Business Context

In a large-scale supply chain environment, order traffic can spike sharply during promotional events, product launches, and regional demand surges. A production-grade system in this domain must:

- accept large volumes of concurrent requests without overwhelming the database
- provide fast stock validation for order placement
- decouple order intake from inventory persistence
- tolerate transient failures in distributed messaging and downstream services
- support safe scaling across multiple runtime instances

This project addresses those requirements through cache-assisted stock validation, request idempotency, asynchronous event delivery, and transactional inventory processing in a supply chain context.

---

## Scope of the Project

This implementation focuses on the core order-to-inventory lifecycle in the supply chain domain.

### In Scope

- order request intake
- authentication and request throttling
- API idempotency protection with Redis
- order domain service separation
- Snowflake-based order ID generation
- outbox-based event publication
- inbox-based consumer deduplication
- inventory validation and cache synchronization
- asynchronous order event delivery
- inventory consumption and transaction processing
- dead-letter handling for failed messages
- local development and containerized runtime support

### Out of Scope

- payment processing
- shipment orchestration
- warehouse picking and packing
- customer-facing order tracking portal
- partner integration APIs
- reporting and analytics dashboards

---

## Implementation Scope

### API Gateway

This implementation covers the gateway-facing flow, including:

- JWT-based authentication checks
- rate limiting at the gateway layer
- API idempotency using Redis
- order request acceptance and forwarding
- returning standardized response envelopes

### Order Service

This implementation covers the order-domain service flow, including:

- order creation
- Snowflake-based `orderId` generation
- UUID-based event/message identifiers
- order status initialization
- outbox event persistence
- supporting asynchronous publication

### Inventory Module

This implementation covers the inventory-side processing flow, including:

- consuming order-created events from RabbitMQ
- performing stock deduction in PostgreSQL
- handling message acknowledgment and failure routing
- using an inbox table for consumer deduplication
- keeping inventory processing isolated from request-time traffic

---

## Domain Ownership

The repository is organized around three primary runtime components for supply chain order and inventory processing:

### API Gateway Domain

Responsible for:

- incoming request handling
- user authorization
- request throttling
- idempotency protection
- forwarding order requests to the order service

### Order Domain

Responsible for:

- order creation
- order ID generation
- order status initialization
- outbox persistence
- event publication readiness

### Inventory Domain

Responsible for:

- stock consumption
- transactional inventory deduction
- inbox deduplication
- failure handling and recovery support

### Shared Platform Concerns

The following concerns are implemented as shared capabilities rather than domain-specific logic:

- configuration management
- database, cache, and message broker clients
- cross-service TypeScript contracts
- environment-driven runtime selection
- standardized response envelopes

---

## Architecture

The architecture below reflects the supply chain order and inventory module boundaries:

```text
Client / Upstream System
        |
        v
API Gateway (Fastify)
  - JWT authentication
  - rate limiting
  - Redis idempotency
  - request forwarding
        |
        v
Order Service (Fastify)
  - order creation
  - Snowflake order IDs
  - outbox persistence
  - order-domain orchestration
        |
        v
RabbitMQ
  - event transport
  - durable queueing
        |
        v
Inventory Worker
  - RabbitMQ consumer
  - inbox deduplication
  - PostgreSQL transaction
  - inventory deduction
  - dead-letter handling

Infrastructure
  - PostgreSQL
  - Redis
  - RabbitMQ
```

### Design Principles

- **Low-latency request admission** through Redis-backed idempotency protection
- **Domain separation** between gateway, order service, and inventory worker
- **Asynchronous decoupling** between order acceptance and inventory persistence
- **Transactional consistency** for inventory updates
- **Failure isolation** through queue-based processing and a DLQ
- **Deployment flexibility** with both local development and containerized runtime paths

---

## Service Boundaries

### `apps/api-gateway`

The API Gateway is the edge service and is responsible for:

- authentication and request authorization
- rate limiting and traffic protection
- API idempotency using Redis
- request forwarding to the order service
- returning immediate order acceptance responses

### `apps/order-service`

The Order Service is the order-domain service and is responsible for:

- receiving forwarded order requests from the gateway
- generating Snowflake-based order IDs
- persisting order records
- writing outbox events
- preparing reliable event publication

### `apps/inventory-worker`

The Inventory Worker is the asynchronous processing service and is responsible for:

- consuming order events from RabbitMQ
- executing inventory updates in PostgreSQL
- handling message acknowledgments
- inbox deduplication for repeated events
- routing failed messages into the DLQ

### `shared/config`

Centralized runtime configuration resolved from environment variables.

### `shared/infrastructure`

Shared connection helpers for PostgreSQL, Redis, and RabbitMQ.

### `shared/types`

Shared TypeScript contracts for cross-service communication.

### `shared/http`

Shared response helpers used by multiple services.

---

## Technology Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **Web Framework**: Fastify
- **Database**: PostgreSQL 16 / Amazon RDS PostgreSQL
- **Cache**: Redis / Amazon ElastiCache Redis
- **Message Broker**: RabbitMQ
- **Containerization**: Docker / Docker Compose
- **API Documentation**: OpenAPI / Swagger
- **Cloud**: AWS ECS Fargate, ALB, VPC, RDS, ElastiCache, ECR, NAT Gateway
- **CI/CD**: GitHub Actions, Docker image build, ECR push, ECS rolling deployment

---

## Non-Functional Requirements

The platform was designed with the following non-functional requirements in mind:

### Performance

- high-throughput order intake
- fast idempotency checks on the request path
- reduced database pressure through Redis caching

### Scalability

- gateway, order service, and worker can be deployed independently
- asynchronous queueing smooths traffic spikes
- service boundaries support future horizontal scaling

### Reliability

- RabbitMQ provides buffering for transient traffic bursts
- outbox and inbox patterns reduce message loss / duplication risk
- dead-letter queue supports failure isolation
- PostgreSQL transactions help preserve data integrity

### Maintainability

- shared code is centralized in `shared/`
- domain responsibilities are separated by service
- TypeScript provides compile-time safety across modules
- tests cover unit, integration, and e2e flows

### Operability

- Docker Compose supports local infrastructure orchestration
- environment-driven configuration supports multiple runtime profiles
- failure paths are explicit and observable
- health, readiness, and metrics endpoints are available

---

## Operational Considerations

This system follows several operational practices that are common in production services:

- **Cache warm-up and fallback**: Redis is treated as a performance layer, while PostgreSQL remains the source of truth.
- **Flow control**: RabbitMQ and `prefetch(1)` help control downstream load.
- **Failure containment**: invalid or failed messages are routed to a dead-letter queue.
- **Deployment separation**: the gateway, order service, and worker can be deployed independently.
- **Runtime flexibility**: local development and containerized execution are both supported.
- **Idempotency**: repeated order submissions can be deduplicated safely at the gateway.
- **Outbox / inbox**: message publication and consumption are made more robust through database-backed coordination.

Additional improvements that would typically be included in a fully mature production environment:

- structured logging with trace correlation
- distributed tracing
- metrics alerting integration
- retry policy and compensation workflow
- secrets management and secure configuration handling

---

## Repository Structure

```text
.
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── README.md
├── scripts
│   ├── reset-db.ts
│   ├── seed.ts
│   ├── load-demo-data.ts
│   └── sync-stock.ts
├── tests
│   ├── e2e
│   ├── integration
│   ├── unit
│   └── setup.ts
├── shared
│   ├── config
│   │   └── index.ts
│   ├── errors
│   ├── http
│   │   └── response.ts
│   ├── infrastructure
│   │   ├── idempotency.ts
│   │   ├── logger.ts
│   │   ├── metrics.ts
│   │   ├── postgres.ts
│   │   ├── rabbitmq.ts
│   │   └── redis.ts
│   ├── types
│   └── utils
│       └── snowflake.ts
└── apps
    ├── api-gateway
    │   └── src
    │       ├── clients
    │       ├── plugins
    │       ├── routes
    │       ├── services
    │       └── server.ts
    ├── inventory-worker
    │   └── src
    │       ├── consumers
    │       ├── repositories
    │       ├── services
    │       └── worker.ts
    └── order-service
        └── src
            ├── repositories
            ├── routes
            ├── services
            ├── worker
            └── server.ts
```

### Module Responsibilities

#### `apps/api-gateway`

Receives order requests, performs authentication and idempotency checks, and forwards order creation to the order service.

#### `apps/order-service`

Receives forwarded order requests, generates order IDs, persists order data, and records outbox events.

#### `apps/inventory-worker`

Consumes order events and applies transactional inventory updates in PostgreSQL.

#### `shared/config`

Centralized configuration management for environment-driven runtime settings.

#### `shared/infrastructure`

Shared connection utilities for PostgreSQL, Redis, RabbitMQ, and idempotency support.

#### `shared/types`

Shared TypeScript contracts used across the distributed services.

---

## Business Flow

### Order Placement Flow

1. A client submits an order request to the API Gateway.
2. The gateway verifies the JWT token and applies request throttling.
3. The gateway checks Redis for an idempotency record.
4. If the request is not cached, the gateway reserves the idempotency key.
5. The gateway forwards the order request to the order service.
6. The order service generates a Snowflake-based `orderId`.
7. The order service persists the order and writes an outbox event.
8. The gateway caches the acceptance response.
9. The inventory worker consumes the downstream event asynchronously.
10. The inventory worker applies the stock deduction transaction in PostgreSQL.
11. Failed messages are routed to the dead-letter queue for follow-up handling.

### Inventory Handling Strategy

- Redis is used as the fast path for gateway-level idempotency protection.
- PostgreSQL remains the source of truth for inventory data.
- Negative stock is rejected immediately to avoid overselling.
- RabbitMQ decouples request-time traffic from inventory persistence.
- The inbox table protects the worker from duplicate message processing.

---

## Key Features

- JWT-based request authentication
- Rate limiting at the API gateway
- Redis-based idempotency protection
- Snowflake-based order IDs
- RabbitMQ-based asynchronous order processing
- Outbox pattern for order event persistence
- Inbox deduplication for consumer safety
- Transactional inventory deduction
- Dead-letter queue routing for failed messages
- Support for monolith and microservice execution modes
- Shared configuration, infrastructure, and type packages

---

## Prerequisites

Before running the project locally, ensure the following are available:

- Node.js 20 or later
- npm 9+
- Docker and Docker Compose
- A `.env` file at the repository root

---

## Environment Configuration

Create a `.env` file in the project root, or use the environment-specific templates:

- 本地开发使用 `.env.local`
- Docker Compose 使用 `.env.docker`

```env
PG_USER=postgres
PG_PASSWORD=postgres
PG_DATABASE=scm_order_inventory
PG_PORT=5432
PG_HOST=localhost

REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost

JWT_SECRET=your-super-secret-key
DEPLOY_MODE=monolith
REMOTE_ORDER_URL=http://localhost:4000
PORT=3000
SNOWFLAKE_MACHINE_ID=1
```

### Configuration Notes

- `PG_HOST` should be `localhost` for local development and the container hostname when running in Docker.
- `DEPLOY_MODE` controls whether the gateway uses the local order flow or forwards to a remote service endpoint.
- `REMOTE_ORDER_URL` is only relevant in microservice mode.
- `SNOWFLAKE_MACHINE_ID` should be unique per running order-service instance in distributed deployments.

---

## Installation

```bash
npm install
```

---

## Build

```bash
npm run build
```

This compiles the TypeScript sources into the `dist/` directory.

---

## Tests

```bash
npm run test
```

Test coverage is organized into:

- unit tests
- integration tests
- e2e smoke tests

---

## API Contract & Documentation

The project now includes a contract-first API documentation layer powered by TypeBox and Swagger/OpenAPI.

### Contract Layer

Shared API contracts are centralized under `shared/api-contracts/` and cover:

- request and response schemas
- common response envelopes
- auth contracts
- order contracts
- inventory message contracts
- centralized error code documentation

### Swagger / OpenAPI

The API Gateway exposes Swagger UI for the documented HTTP API surface.

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs/json`

Documented endpoints include:

- `POST /api/orders`
- `GET /api/health`
- `GET /api/ready`
- `GET /api/metrics`

The OpenAPI specification can also be exported via:

```bash
npm run docs:openapi
```

This generates `openapi.json` at the repository root.

---

## Data Preparation

The repository includes scripts for local data preparation and reset workflows.

### Reset database

```bash
npm run db:reset
```

### Seed base inventory data

```bash
npm run db:seed
```

### Load demo data

```bash
npm run db:demo
```

### Full preparation flow

```bash
npm run db:prepare
```

This performs:

- database reset
- base inventory seed
- demo data load

---

## Local Development

### 1. Start infrastructure services

```bash
docker compose up -d
```

This starts:

- PostgreSQL
- Redis
- RabbitMQ

### 2. Prepare data

```bash
npm run db:prepare
```

### 3. Build the application

```bash
npm run build
```

### 4. Start the API Gateway

```bash
npm run start:gateway
```

### 5. Start the Inventory Worker

```bash
npm run start:worker
```

---

## Development Mode

### Run the API Gateway in development mode

```bash
npm run dev:gateway
```

### Run the Inventory Worker in development mode

```bash
npm run dev:worker
```

---

## Docker Compose

The repository includes a `docker-compose.yml` file for local infrastructure orchestration and service runtime.

### Services

- `scm-db`: PostgreSQL 16 Alpine
- `scm-redis`: Redis Alpine
- `scm-mq`: RabbitMQ with management UI
- `api-gateway`: application container for the gateway service
- `inventory-worker`: application container for the inventory consumer

### Ports

- PostgreSQL: `5432`
- Redis: `6379`
- RabbitMQ AMQP: `5672`
- RabbitMQ Management UI: `15672`
- API Gateway: `3000`

### RabbitMQ Management UI

Open the management console at:

```text
http://localhost:15672
```

---

## Database Initialization

The PostgreSQL container mounts the initialization script from:

```text
./database/init.sql
```

This script is executed automatically during the first database startup.

For a production-grade lifecycle, this approach should eventually be replaced with versioned database migrations.

---

## API Behavior

### Authentication

All protected routes require a JWT token in the following header:

```http
Authorization: Bearer <token>
```

### Idempotency

Order submission requests require the following header:

```http
Idempotency-Key: <unique-client-generated-key>
```

The gateway uses Redis to deduplicate repeated order submissions and prevent duplicate order creation.

### Rate Limiting

The gateway applies request throttling through `@fastify/rate-limit` to protect the order intake path from traffic spikes.

### Order Forwarding

The gateway forwards accepted order requests to the order service, which is responsible for order ID generation, order persistence, and outbox event creation.

---

## Main Endpoint

### `POST /api/orders`

Creates an order request and returns an asynchronous acceptance response.

#### Request Body

```json
{
  "productId": "P10001",
  "quantity": 2
}
```

#### Success Response

```json
{
  "message": "Order Accepted",
  "orderId": "ORD_xxxxxxxxxxxxxxxxxxxxx",
  "status": "PROCESSING"
}
```

#### Common Error Responses

- `401 Unauthorized`
- `400 Bad Request`
- `409 Request In Progress`
- `500 Internal Server Error`

---

## Order Service Behavior

The order service is responsible for domain-level order handling.

### Processing Steps

- validate the order request payload
- generate a Snowflake-based order ID
- generate a UUID-based event ID
- persist the order in PostgreSQL
- write an outbox record for downstream publication
- return the acceptance response to the gateway

### Failure Handling

Order creation failures are returned to the gateway and do not produce an outbox event.

---

## Inventory Worker Behavior

The inventory worker is responsible for asynchronous order consumption and inventory persistence.

### Processing Steps

- assert the order queue and dead-letter queue
- bind the required exchanges and routing keys
- configure `prefetch(1)` for controlled message throughput
- parse the incoming order event
- execute the inventory transaction in PostgreSQL
- acknowledge successful messages
- route failed messages to the dead-letter queue

### Failure Handling

Message consumption failures are not silently dropped. They are routed to the DLQ to support operational follow-up, investigation, or later compensation workflows.

---

## Key Design Decisions

### Redis for Fast Idempotency Access

Order submission is a high-frequency write scenario. Redis significantly reduces duplicate order pressure and improves request handling during retries or repeated clicks.

### RabbitMQ for Asynchronous Decoupling

The order intake path is separated from inventory persistence to improve throughput and to make the system resilient under burst load.

### PostgreSQL for Transactional Consistency

PostgreSQL provides the transactional guarantees required for stock deduction and order persistence.

### Outbox Pattern for Reliable Publication

The order service records events in an outbox table so that event creation is durable and can be published independently of the request lifecycle.

### Inbox Pattern for Consumer Safety

The inventory worker uses a processed message table to avoid double-processing duplicate RabbitMQ deliveries.

### Dead-Letter Queue for Operational Safety

Failed inventory messages are routed to a dead-letter queue rather than being lost, which improves observability and operational recovery.

### Dual Execution Modes

The repository supports both local monolith execution and microservice-style forwarding, which is useful for incremental migration and environment flexibility.

---

## CI/CD

The repository now includes GitHub Actions workflows for continuous integration, Docker image builds, and environment deployments.

### CI Workflow

The CI workflow runs automatically on pushes and pull requests to `main` and performs:

- `npm ci`
- TypeScript build validation
- full test suite execution
- OpenAPI export
- OpenAPI artifact upload

Workflow file:

- `.github/workflows/ci.yml`

### Docker Image Build Workflow

Docker images are built per service and pushed to GHCR on `main` pushes.

Service images:

- `scm-api-gateway`
- `scm-order-service`
- `scm-inventory-worker`

Workflow file:

- `.github/workflows/build.yml`

### Staging Deployment Workflow

A staging deployment workflow is available for SSH-based deployment to a staging host.

Workflow file:

- `.github/workflows/deploy-staging.yml`

### Production Deployment Workflow

A production deployment workflow is available and configured to use GitHub Environments for approval-based release control.

Workflow file:

- `.github/workflows/deploy-production.yml`

These deployment workflows require repository secrets and target host configuration before they can be used in a real environment.

## AWS Cloud Deployment

This project includes an AWS deployment architecture for running the SCM backend services in a cloud environment.

The deployment uses a VPC-based three-tier network design:

- Public subnets for the Application Load Balancer and NAT Gateway
- Private application subnets for ECS Fargate tasks
- Private data subnets for PostgreSQL and Redis
- Security groups to control traffic between the load balancer, application services, database, and cache layers
- NAT Gateway for outbound internet access from private application subnets

### Data Tier

The data layer is deployed using managed AWS services:

- Amazon RDS for PostgreSQL, deployed in private data subnets
- Amazon ElastiCache for Redis, deployed in private data subnets
- Database and cache endpoints are provided to the backend services through environment-based configuration

### Container Registry

The backend services are packaged as Docker images and stored in Amazon Elastic Container Registry.

The image delivery flow includes:

1. Building production Docker images locally or through CI/CD
2. Authenticating to Amazon ECR using AWS CLI or GitHub Actions credentials
3. Tagging service images
4. Pushing images to private ECR repositories

### Compute and Routing

The application services are deployed using Amazon ECS with Fargate.

The runtime architecture includes:

- Application Load Balancer deployed in public subnets
- ECS Fargate tasks running in private application subnets
- Task definitions referencing ECR image URLs
- ECS services managing desired task count and rolling updates
- Health checks routed through the Application Load Balancer

### CI/CD Deployment

The repository includes a GitHub Actions deployment workflow for AWS ECS.

On merge to the `main` branch, the workflow can:

1. Install dependencies
2. Build and validate the application
3. Build Docker images
4. Push images to Amazon ECR
5. Update ECS task definitions
6. Trigger ECS rolling deployment

AWS credentials are stored securely in GitHub Secrets and used by the workflow to authenticate with AWS services.

### Production-Oriented Notes

This deployment demonstrates a production-oriented backend deployment approach using managed AWS infrastructure. In a real production environment, additional hardening would typically include:

- Secrets Manager or SSM Parameter Store for sensitive configuration
- CloudWatch log aggregation and alarms
- Auto scaling policies for ECS services
- RDS backup and maintenance configuration
- HTTPS termination and certificate management through ACM
- Infrastructure as Code using Terraform, CDK, or CloudFormation

## Release and Deployment Notes

### Current Deployment Model

The repository currently supports local containerized deployment and service execution through the following patterns:

- local development with `tsx`
- compiled runtime execution with `node dist/...`
- infrastructure bootstrap via Docker Compose

### Recommended Production Release Flow

A more complete enterprise deployment process would usually include:

1. pull request review and approval
2. automated linting and testing
3. TypeScript build validation
4. Docker image build
5. staging deployment verification
6. production release with rollback capability

### Environment Separation

For a production setup, the following runtime environments should be separated:

- `local`
- `dev`
- `staging`
- `prod`

### Operational Readiness Items

Before promoting this system into a production environment, the following should be added or hardened:

- health and readiness probes
- centralized logging
- request tracing
- alerting and dashboards
- backup and restore strategy
- secret management
- release rollback plan

---

## Production-Oriented Considerations

The current implementation already reflects several enterprise-oriented decisions:

- separation of request-time and async processing paths
- idempotent request handling
- Snowflake order IDs
- cache-assisted request deduplication
- queue-backed workload buffering
- transactional inventory handling
- shared contracts across services
- containerized local infrastructure

To further evolve this into a full production system, the following enhancements are recommended:

- centralized structured logging
- request correlation IDs
- formal input and output schema validation
- broader automated test coverage
- retry strategy and compensation workflows
- migration-based database management
- metrics, tracing, and alerting

---

## Troubleshooting

### PostgreSQL connection issues

Check the following:

- `.env` values are correct
- the database container is running
- `PG_HOST` matches the runtime environment

### Redis connection issues

Check the following:

- `REDIS_URL` is correct
- the Redis container is running
- the port is reachable from the application runtime

### RabbitMQ connection issues

Check the following:

- `RABBITMQ_URL` is correct
- the RabbitMQ container is running
- the configured exchange and queue names match the application settings

### Build failures

Check the following:

- TypeScript compilation errors
- import path correctness
- missing environment variables
- strict type issues introduced by local changes

---

## License

This project is licensed under `ISC` as defined in `package.json`.

---

## Project Summary

This repository showcases a SCM order and inventory module designed with distributed systems principles, high-concurrency readiness, and modular service boundaries.

It is intended to represent a realistic enterprise backend implementation rather than a classroom exercise or a temporary demo.
