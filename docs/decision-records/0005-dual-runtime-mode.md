# ADR 0005: Support Both Monolith and Microservice Execution Modes

## Status

Accepted

---

## Context

The repository is part of a larger supply chain modernization effort and is expected to evolve over time.

During development and migration, it is useful to run the order flow locally as a single process. At the same time, the system should be able to forward requests to a remote order service when the architecture is split further.

---

## Decision

Support two execution modes through configuration:

- **monolith**: the gateway executes the local order service implementation
- **microservice**: the gateway forwards to an external order service endpoint

The mode is selected with `DEPLOY_MODE`.

---

## Alternatives Considered

### 1. Commit to microservices only from day one

**Rejected** because local development and incremental migration would be more difficult.

### 2. Keep only monolith mode forever

**Rejected** because the business direction requires distributed deployment readiness.

### 3. Use compile-time branching instead of runtime configuration

**Rejected** because runtime configuration is easier for environment-specific execution.

---

## Consequences

### Positive

- easier local development and debugging
- smoother migration from local to distributed execution
- fewer codebase changes when validating different deployment models

### Negative

- the codebase contains two execution paths
- documentation must clearly explain which path is currently active
- the remote service endpoint must be managed separately when microservice mode is used

---

## Notes

The remote endpoint is not implemented in this repository. The forwarding client is included to reflect the planned distributed deployment model and migration path.