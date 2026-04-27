# ADR 0002: Use RabbitMQ for Asynchronous Order Events

## Status

Accepted

---

## Context

The order intake service must acknowledge valid requests quickly, but inventory persistence should not block the synchronous API path.

A messaging layer is needed to decouple order acceptance from downstream inventory processing.

---

## Decision

Use RabbitMQ to publish order-created events from the API Gateway and consume them asynchronously in the inventory worker.

The gateway publishes an order event after stock validation. The worker consumes the event and applies the inventory transaction independently.

---

## Alternatives Considered

### 1. Perform inventory updates synchronously in the gateway

**Rejected** because it would:

- couple request latency to downstream database work
- reduce throughput during traffic bursts
- make the gateway harder to scale independently

### 2. Use a database polling mechanism

**Rejected** because polling increases latency, wastes resources, and is less suitable for near-real-time event delivery.

### 3. Use Redis Streams as the message backbone

**Rejected** for this implementation because RabbitMQ provides clearer queue semantics, DLQ support, and familiar operational behavior for this workflow.

---

## Consequences

### Positive

- order acceptance becomes asynchronous and responsive
- inventory processing can be scaled independently
- burst traffic can be buffered by the queue
- dead-letter handling is straightforward

### Negative

- the system becomes eventually consistent between the order API and inventory processing
- message delivery and consumer failure scenarios must be handled explicitly
- operational visibility is required to monitor queue health

---

## Notes

RabbitMQ is a good fit for this repository because the goal is reliable command delivery, not long-term event analytics or stream replay.