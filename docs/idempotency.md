# Idempotency Guide

## 1. Purpose

This document describes the idempotency implementation already present in this repository for the Nike supply chain order and inventory platform.

The goal is to prevent duplicate order creation when a client retries the same request, while keeping the implementation lightweight and compatible with the current Redis-based architecture.

> **Scope note:** this repository covers only the order and inventory portion of the broader supply chain modernization effort.

---

## 2. What Is Already Implemented

The repository already includes a minimal Redis-based idempotency design in the API Gateway order flow.

Current capabilities:

- request deduplication via `Idempotency-Key`
- short-lived Redis lock to prevent concurrent duplicate execution
- cached success response for repeated requests
- response TTL for idempotency records
- lock release in the order route cleanup path

This means repeated client submissions of the same order request do not create duplicate orders as long as the same idempotency key is reused within the TTL window.

---

## 3. Why Idempotency Is Needed

Order submission is a retry-prone operation.

A client may resend the same request because of:

- network timeouts
- upstream gateway retries
- user double-clicks
- mobile reconnects
- browser resubmission

Without idempotency protection, the same purchase can be processed more than once.

---

## 4. Request Contract

### Required header

The order API accepts the following request header:

```http
Idempotency-Key: <unique-client-generated-key>
```

### Current behavior

- If the header is missing, the gateway rejects the request.
- If the header is present, the gateway uses it as the deduplication key.

---

## 5. Storage Model

The implementation uses two Redis keys.

### 5.1 Reservation lock key

Used to prevent concurrent duplicate execution.

Pattern:

```text
idempotency:lock:<idempotency-key>
```

#### Value

- a simple marker value such as `1`

#### TTL

- **60 seconds**

#### Purpose

This lock is short-lived and only exists while the request is actively being processed.

---

### 5.2 Final response key

Used to return the exact same result for repeated requests.

Pattern:

```text
idempotency:<idempotency-key>
```

#### Value

A serialized record containing:

- HTTP status code
- response body

Example:

```json
{
  "statusCode": 202,
  "body": {
    "message": "Order Accepted",
    "orderId": "ORD_xxxxxxxxxxxxxxxxxxxxx",
    "status": "PROCESSING"
  }
}
```

#### TTL

- **24 hours**

#### Purpose

This key lets the gateway return the same success response for retries without re-executing the order flow.

---

## 6. Request Flow in the Codebase

### Step 1: Check for cached result

When a request arrives, the gateway first checks whether a completed idempotency record already exists in Redis.

If found, the gateway immediately returns the stored response.

---

### Step 2: Reserve the key

If no cached result exists, the gateway attempts to reserve the idempotency key with a short Redis lock.

If the lock cannot be acquired, the request is rejected as already in progress.

Recommended response:

- **409 Conflict**

---

### Step 3: Execute the order flow

If the lock is acquired, the gateway proceeds with the normal order flow:

- validate request body
- check stock
- publish order event
- return acceptance response

---

### Step 4: Store the final response

If the request succeeds, the gateway stores the final response in Redis using the idempotency result key.

This makes future retries return the same response.

---

### Step 5: Release the lock on completion

The route releases the reservation lock in the `finally` block so the key does not remain locked after processing.

---

## 7. Response Rules

### 7.1 First successful request

Return:

- `202 Accepted`
- standard success envelope

Example:

```json
{
  "success": true,
  "data": {
    "message": "Order Accepted",
    "orderId": "ORD_xxxxxxxxxxxxxxxxxxxxx",
    "status": "PROCESSING"
  }
}
```

---

### 7.2 Repeated request after success

Return the same stored response:

- same status code
- same body

This makes the request effectively idempotent from the client’s point of view.

---

### 7.3 Repeated request while processing

Return:

- `409 Conflict`
- standard error envelope

Example:

```json
{
  "success": false,
  "error": {
    "code": "REQUEST_IN_PROGRESS",
    "message": "The same idempotency key is being processed"
  }
}
```

---

### 7.4 Missing header

Return:

- `400 Bad Request`

Example:

```json
{
  "success": false,
  "error": {
    "code": "IDEMPOTENCY_KEY_REQUIRED",
    "message": "Idempotency-Key header is required"
  }
}
```

---

## 8. Files Involved

### `shared/infrastructure/idempotency.ts`
Responsibilities:
- build Redis keys
- reserve a lock
- store a final response
- read a cached response
- release the reservation lock

### `apps/api-gateway/src/routes/order.routes.ts`
Responsibilities:
- read the `Idempotency-Key` header
- validate header presence
- check Redis for cached result
- reserve a lock when needed
- execute the order flow only once
- store the final result in Redis
- return cached results for retries

---

## 9. Helper Functions

The helper module currently exposes functions similar to the following:

- `getCachedIdempotencyRecord()`
- `reserveIdempotencyKey()`
- `storeIdempotencyRecord()`
- `releaseIdempotencyReservation()`
- `getDefaultIdempotencyTtlSeconds()`

These functions keep the route code small and keep idempotency logic centralized.

---

## 10. Why This Is a Good Fit for This Repository

This strategy fits the current repository because:

- Redis already exists as a performance and coordination layer
- the order API is the synchronous entry point
- the order flow already returns a standard response envelope
- the architecture already separates request acceptance from worker-side fulfillment

This means idempotency can be implemented without introducing a new database table or a heavier workflow engine.

---

## 11. Limitations

This is a minimal implementation, not a full enterprise idempotency platform.

Known limitations:

- Redis loss can remove cached idempotency records
- lock TTL must be tuned carefully
- partial failures may require operational review
- worker-side duplicate handling is still a separate concern

If the system later grows, the idempotency strategy can be extended with:

- database-backed deduplication
- order submission audit records
- per-user or per-cart constraints
- worker-side message deduplication

---

## 12. Summary

The repository already implements a practical Redis-based idempotency mechanism:

- requires `Idempotency-Key`
- reserves a short Redis lock
- stores the final response for 24 hours
- returns the cached response on retries
- rejects concurrent duplicate execution with `409 Conflict`

This is simple, practical, and consistent with the rest of the system design.