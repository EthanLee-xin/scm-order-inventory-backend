# ADR 0003: Use PostgreSQL Transactions for Inventory Consistency

## Status

Accepted

---

## Context

Inventory deduction and order persistence must be kept consistent.

If stock is reduced but the order record is not written, or if the order is written but stock is not reduced, the system ends up in an invalid business state.

The inventory workflow therefore requires atomic persistence.

---

## Decision

Use a PostgreSQL transaction to perform inventory deduction and order record insertion as a single unit of work.

The repository implementation begins a transaction, updates inventory only when sufficient stock exists, writes the order record, and commits both changes together.

---

## Alternatives Considered

### 1. Separate inventory and order writes into two independent operations

**Rejected** because partial failure would create inconsistent state and require compensation logic.

### 2. Use an eventually consistent workflow without transactions

**Rejected** because this repository requires stronger correctness guarantees for stock deduction.

### 3. Use distributed transactions across services

**Rejected** because distributed 2PC-style coordination is operationally expensive and unnecessary for this scope.

---

## Consequences

### Positive

- inventory deduction and order persistence stay aligned
- rollback behavior prevents partial writes
- the implementation is easy to reason about at the database level

### Negative

- transaction scope must be kept small to avoid locking overhead
- downstream consistency is still eventual because the order starts as an asynchronous event
- consumer retries and duplicate messages must still be considered separately

---

## Notes

This decision protects the core inventory lifecycle but does not by itself solve idempotency or message duplication. Those are separate concerns for later hardening.