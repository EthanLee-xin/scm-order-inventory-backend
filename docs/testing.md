# Testing Strategy

## Overview

This repository includes a minimal but executable testing strategy for the Nike supply chain order and inventory platform.

The test suite is designed to validate the business-critical paths owned in this repository:

- authentication
- order intake
- inventory transaction processing
- HTTP response behavior
- end-to-end order acceptance flow

> **Scope note:** the tests cover only the order and inventory portion of the broader supply chain platform represented in this repository.

---

## Test Objectives

The main goals of the test suite are to:

- verify that core business rules behave as expected
- protect the order and inventory path from regressions
- validate error handling on the request path and consumer path
- provide a reproducible baseline for future expansion

---

## Test Structure

```text
tests/
├── setup.ts
├── unit/
│   ├── authHook.test.ts
│   ├── order.service.test.ts
│   └── inventory.repository.test.ts
├── integration/
│   └── orders.api.test.ts
└── e2e/
    └── order-flow.e2e.test.ts
```

### `tests/setup.ts`

Shared test bootstrap file.

Responsibilities:

- define default environment variables for test execution
- restore mocks after each test
- keep runtime assumptions consistent across the suite

### `tests/unit/`

Unit tests validate isolated behavior in the gateway and inventory layers.

Covered components:

- `authHook`
- `OrderService`
- `InventoryRepository`

### `tests/integration/`

Integration tests validate the API route behavior using a Fastify instance and mocked domain dependencies.

### `tests/e2e/`

End-to-end tests validate the order acceptance flow at a high level using the route layer and dependency injection.

---

## Response Envelope

All API responses in the repository now follow a standard envelope:

### Success response

```json
{
  "success": true,
  "data": {
    "...": "..."
  }
}
```

### Error response

```json
{
  "success": false,
  "error": {
    "code": "OUT_OF_STOCK",
    "message": "Out of Stock"
  }
}
```

This structure makes responses easier to consume consistently across the gateway and any future clients.

---

## Test Levels

### Unit Tests

Unit tests focus on local business logic and error handling.

Examples:

- missing token returns unauthorized
- valid token populates request user context
- order service publishes events when stock is available
- inventory repository commits or rolls back transactions correctly

### Integration Tests

Integration tests verify route behavior, request handling, and response generation.

Examples:

- `POST /api/orders` returns `202` for valid requests
- out-of-stock scenarios return `400`

### E2E Smoke Tests

The end-to-end test acts as a smoke test for the accepted order flow.

Examples:

- request enters the gateway
- order processing function is invoked
- acceptance response is returned

---

## Test Tooling

The repository uses:

- **Vitest** for unit and integration style tests
- **Fastify inject** for route-level testing without opening a network port
- **Mocked dependencies** for isolating behavior under test

### Test Commands

```bash
npm test
npm run test:watch
npm run test:coverage
```

---

## Current Coverage

The current minimal suite covers:

- JWT authentication hook behavior
- Redis / PostgreSQL order processing flow
- PostgreSQL inventory transaction handling
- API route acceptance behavior
- an end-to-end smoke test for the order acceptance path

---

## Testing Principles

### 1. Focus on business-critical paths

The first tests should protect the most important behaviors in the system, especially those related to order acceptance and inventory consistency.

### 2. Prefer deterministic tests

Tests should avoid external dependencies where possible and use mocks or controlled test doubles for stable execution.

### 3. Keep the suite fast

Fast tests encourage frequent execution during development and reduce the cost of regression checks.

### 4. Expand coverage incrementally

Once the critical path is protected, the suite can be extended to cover:

- DLQ behavior
- remote service forwarding
- consumer retry handling
- cache-miss scenarios with real infrastructure
- idempotency and duplicate message handling

---

## Test Environment Notes

Test execution uses default environment variables defined in `tests/setup.ts` so that the suite can run consistently without depending on a manually prepared local shell environment.

This includes defaults for:

- `JWT_SECRET`
- `DEPLOY_MODE`
- `REMOTE_ORDER_URL`
- `REDIS_URL`
- `RABBITMQ_URL`
- PostgreSQL connection settings

---

## Practical Limitations

The current suite is intentionally minimal and is meant to establish a reliable foundation.

It does not yet include:

- real database integration through containers
- real RabbitMQ broker tests
- true network-level end-to-end validation
- performance or load testing
- contract tests for a remote service boundary

These can be added later as the repository continues to evolve.

---

## Recommended Next Steps

A more mature testing program would typically add:

- containerized integration tests
- dead-letter queue assertions
- cache-miss and oversell scenario coverage
- duplicate event handling tests
- remote forwarding behavior tests
- CI execution on every pull request

---

## Summary

The current testing strategy demonstrates that the repository is not just a code sample, but a system with protected business flows and a defined path for expanding quality assurance over time.