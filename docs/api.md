# API Reference

## 1. Purpose

This document describes the HTTP interface exposed by the order entry service in this repository.

The repository currently implements the order intake path for the Nike supply chain modernization program. The API surface is intentionally narrow and focused on the responsibilities owned in this codebase:

- order request acceptance
- authentication enforcement
- inventory availability validation
- asynchronous order event publication
- immediate acceptance responses for downstream processing

> **Scope note:** this repository covers only the order and inventory portion of the broader supply chain platform. Other business APIs such as shipment tracking, warehouse operations, customer order management, and partner integrations are outside the scope of this codebase.

---

## 2. API Characteristics

- **Protocol**: HTTP/JSON
- **Base path**: `/api`
- **Authentication**: JWT Bearer token
- **Rate limiting**: enabled at the gateway layer
- **Processing model**: asynchronous order acceptance

The gateway returns an acceptance response once the order has passed validation and the order event has been published.

---

## 3. Authentication

All protected routes require a valid JWT in the `Authorization` header.

```http
Authorization: Bearer <token>
```

If the token is missing, malformed, invalid, or expired, the request is rejected with `401 Unauthorized`.

### Token payload

The authentication layer expects a user payload that contains at least:

- `id`
- optional `role`

---

## 4. Rate Limiting

The gateway applies request throttling using `@fastify/rate-limit`.

Current configuration in code:

- `max`: `2`
- `timeWindow`: `1 second`

This is intended to protect the order intake path from sudden request bursts during local validation and demonstration scenarios.

---

## 5. Common Response Pattern

The current implementation uses a lightweight error-response style.

### Success response pattern

```json
{
  "message": "..."
}
```

### Error response pattern

```json
{
  "error": "..."
}
```

In the current codebase, detailed error envelopes and standardized error codes are not yet introduced.

---

## 6. Endpoints

### `POST /api/orders`

Creates an order request and publishes an asynchronous order event.

#### Description

This endpoint is the primary synchronous entry point for the order flow.

The request is processed as follows:

1. The JWT token is validated by the gateway hook.
2. Rate limiting is applied.
3. Inventory is checked through Redis first.
4. On cache miss, PostgreSQL is queried and Redis is refreshed.
5. If stock is available, an order event is created.
6. The event is published to RabbitMQ.
7. The API returns an acceptance response.

#### Request body

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `productId` | string | yes | Product identifier |
| `quantity` | number | yes | Requested quantity |

#### Example request

```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "productId": "P10001",
  "quantity": 2
}
```

#### Success response

- **Status**: `202 Accepted`

```json
{
  "message": "Order Accepted",
  "orderId": "ORD_xxxxxxxxxxxxxxxxxxxxx",
  "status": "PROCESSING"
}
```

#### Error responses

- **401 Unauthorized**
  - returned when the token is missing, invalid, or expired

- **400 Bad Request**
  - returned when stock is insufficient

```json
{
  "error": "Out of Stock"
}
```

- **500 Internal Server Error**
  - returned when an unexpected error occurs in the order flow

```json
{
  "error": "Internal Server Error"
}
```

---

## 7. Internal Runtime Behavior

The gateway supports two execution modes through configuration.

### Monolith mode

When `DEPLOY_MODE=monolith`, the gateway uses the local order service implementation and handles the inventory check and message publication directly.

### Microservice mode

When `DEPLOY_MODE=microservice`, the gateway forwards the request to an external order service endpoint configured by `REMOTE_ORDER_URL`.

> The remote order service is not implemented in this repository. The current code only contains the forwarding client used when that deployment mode is enabled.

---

## 8. Event Contract

The order creation event published to RabbitMQ contains the following fields:

| Field | Type | Description |
| --- | --- | --- |
| `orderId` | string | Generated order identifier |
| `userId` | string | Requesting user identifier |
| `productId` | string | Product identifier |
| `quantity` | number | Ordered quantity |
| `timestamp` | string | ISO timestamp of event creation |

### Example event payload

```json
{
  "orderId": "ORD_4d5c2e1b-6d7f-4a3c-9f2a-1a2b3c4d5e6f",
  "userId": "usr_1001",
  "productId": "P10001",
  "quantity": 2,
  "timestamp": "2026-04-26T10:00:00.000Z"
}
```

---

## 9. Inventory Worker Interaction Notes

The worker consumes order-created events asynchronously.

The API layer itself does not wait for inventory persistence to complete before returning success. Instead, it returns an acceptance response after publishing the event.

This means the API represents the **order acceptance boundary**, while the worker represents the **inventory consistency boundary**.

---

## 10. Implementation Notes

### Route prefix

The route registration in code uses the `api` prefix, which results in the following external endpoint:

```text
/api/orders
```

### Stock handling behavior

The order service uses a cache-aside strategy:

- `Redis` is checked first
- `PostgreSQL` is queried on cache miss
- Redis is refreshed using a TTL
- negative stock results in an immediate rejection

### Message publication

The order service publishes events to the RabbitMQ exchange defined in shared configuration.

---

## 11. Current API Surface

At the time of writing, the externally exposed order API in this repository is:

- `POST /api/orders`

No additional public REST endpoints are currently implemented in this codebase.

---

## 12. Planned API Extensions

The broader supply chain platform may later include additional APIs such as:

- order status query
- order cancellation
- inventory lookup
- shipment tracking
- operational/admin endpoints

These are not part of the current repository scope.