# ADR 0004: Separate Synchronous Order Intake from Asynchronous Inventory Processing

## Status

Accepted

---

## Context

The order intake path and the inventory processing path have different runtime characteristics.

The gateway must respond quickly to user requests, while inventory processing can occur asynchronously and may require database work, queue consumption, and failure handling.

Keeping these concerns in a single synchronous flow would reduce scalability and create a tighter operational coupling.

---

## Decision

Split the system into two runtime roles:

- the **API Gateway** handles synchronous order intake
- the **Inventory Worker** handles asynchronous inventory processing

The gateway publishes events and returns acceptance responses. The worker consumes those events and performs the inventory transaction.

---

## Alternatives Considered

### 1. Single synchronous service for all responsibilities

**Rejected** because it would mix edge concerns, business validation, and inventory persistence in one runtime.

### 2. Multiple fully independent services without a gateway pattern

**Rejected** because the repository needs a clear entry point for authentication, rate limiting, and request normalization.

### 3. Serverless function-based processing

**Rejected** because the workflow benefits from long-lived consumers, queue control, and direct database interaction.

---

## Consequences

### Positive

- clearer service boundaries
- better scalability for request intake and background processing
- reduced coupling between user-facing traffic and inventory writes
- easier operational isolation of queue consumers

### Negative

- eventual consistency between acceptance and final inventory persistence
- additional deployment and orchestration complexity
- the need to monitor both HTTP and messaging layers

---

## Notes

This split reflects common enterprise practice for high-concurrency commerce and supply chain systems where request acceptance and fulfillment processing are intentionally decoupled.