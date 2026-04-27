# Architecture Decision Records

This directory contains the key technical decisions made for the Nike supply chain order and inventory platform.

The purpose of these documents is to explain **why** the current implementation was chosen, not just **what** was implemented. In a production environment, this kind of record helps future engineers understand trade-offs, operational constraints, and the reasoning behind major architectural choices.

> **Scope note:** these decisions apply to the order and inventory portion of the broader supply chain modernization effort represented by this repository.

---

## Decision Index

- `0001-redis-stock-cache.md` — use Redis as a fast inventory cache
- `0002-rabbitmq-order-events.md` — use RabbitMQ for asynchronous order events
- `0003-postgres-transactional-inventory.md` — use PostgreSQL transactions for inventory consistency
- `0004-gateway-worker-separation.md` — separate synchronous order intake from asynchronous inventory processing
- `0005-dual-runtime-mode.md` — support both monolith and microservice execution modes

---

## How to read these records

Each decision record follows a lightweight ADR-style structure:

- **Context** — the problem being solved
- **Decision** — the solution adopted in this repository
- **Alternatives considered** — other approaches that were evaluated
- **Consequences** — trade-offs and implications

This format keeps the documentation compact while still being useful in reviews, onboarding, and architectural discussion.