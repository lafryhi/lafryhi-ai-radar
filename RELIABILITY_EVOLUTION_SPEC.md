# Phase 5 Reliability Evolution Specification

## Status

Proposed architecture only. No production replay endpoint, test runner, fault injector, deployment, or data mutation is authorized.

## Purpose

Reliability Evolution establishes controlled evidence that AI Radar behaves safely under deterministic re-execution, injected faults, sustained load, provider degradation, data anomalies, and recovery scenarios.

## Safety boundary

- Reliability tools use synthetic data or approved sanitized fixtures.
- Fault injection is impossible against production by credentials, network policy, environment identity, and runtime guard.
- Synthetic canaries cannot approve or publish.
- The internal readiness-finalization operation remains unexposed in production.
- Production records are not replayed into production.
- Test clocks, randomness, providers, and retry timing are controllable.
- Failure evidence is preserved; partial diagnostic records are not deleted automatically.

## Test environment tiers

| Tier | Data | Writes | Purpose |
|---|---|---|---|
| Unit | Generated fixtures | In-memory | Pure functions and failure tables |
| Contract | Sanitized/generative fixtures | Adapter test stores | Cross-adapter semantics |
| Simulator | Sanitized recorded envelopes | Isolated ephemeral store | End-to-end deterministic replay |
| Staging | Synthetic trusted sources | Dedicated staging services/stores | Deployment and integration |
| Production synthetic observation | Non-content health probes only unless separately approved | No protected-domain writes | Availability and safe telemetry |

Production canary processing continues to use the supported operator path and the controlled protocol. It is not replaced by a replay interface.

## Chaos testing

### Fault domains

- provider timeout, 429, 5xx, malformed output, truncation, and empty output;
- network reset, DNS failure, latency, and partial response;
- Firestore transient error, contention, unavailable, and post-commit disconnect;
- process termination before/during/after a conceptual stage;
- queue delay, duplicate delivery, and out-of-order delivery;
- clock skew and expired deadlines;
- metric backend outage;
- source encoding, Unicode, HTML, and oversized input anomalies;
- model/schema/prompt version mismatch;
- Phase 5 processor backlog or crash.

### Rules

- Each fault maps to a typed expected outcome and invariant set.
- Injection points are explicit and compile-time/test-environment gated.
- A scenario has a seed, fixture version, clock, and failure schedule.
- Random campaigns record the seed and minimize failing cases.
- No fault can relax validation or trigger automatic approval/publication.

## Fault injection architecture

A provider/repository/clock/queue boundary exposes test-only adapters. A scenario describes:

- target operation;
- attempt or conceptual boundary;
- fault type;
- duration/count;
- expected retry decision;
- expected terminal category;
- expected records and prohibited records;
- expected telemetry allowlist.

Production builds either exclude injection adapters or require an environment identity unavailable in production. The final enforcement choice needs an accepted ADR.

## Synthetic canaries

### Canary catalog

- exact valid evidence;
- paraphrased evidence;
- Unicode NFC-equivalent evidence;
- NFKC-only mismatch;
- malformed/schema-invalid model output;
- duplicate and conflicting entity/article records;
- transient provider recovery and exhaustion;
- atomic readiness success, conflict, and post-commit disconnect;
- stale complete/empty/partial state;
- explicit human approval and idempotent publication in staging;
- Phase 5 duplicate, conflict, Story, and editorial fixtures.

### Design

Each canary has a known ID, non-sensitive content, expected artifact graph, ceiling expectations, and cleanup/retention policy. Canary records are unmistakably synthetic and excluded from production editorial metrics.

Production scheduling is limited to non-mutating probes unless a future canary protocol explicitly approves one supported-path source. No hidden endpoint is introduced.

## Pipeline replay simulator

### Inputs

- sanitized immutable source snapshot;
- prior-coverage snapshot;
- recorded provider response envelope or deterministic fake provider;
- model/prompt/schema/algorithm versions;
- feature-control snapshot;
- logical clock;
- repository starting state;
- expected safe telemetry.

### Outputs

- ordered typed decisions;
- accepted/rejected artifacts;
- repository state diff in the isolated store;
- safe telemetry events;
- invariant results;
- deterministic output digest;
- performance measurements.

### Guarantees

- Replay never calls production services or writes production data.
- Raw production model output is not required or reconstructed.
- Recorded fixtures follow approved privacy policy.
- Partial output is not merged.
- Repeated fixed runs yield identical semantic results and state.
- Differences between versions are explicit comparison reports.

## Load testing

### Workload dimensions

- sources/minute;
- concurrent processing runs;
- article size and language distribution;
- duplicate/near-duplicate density;
- recovery frequency;
- Story graph size;
- operator review activity;
- metric event volume;
- publisher/source skew.

### Tests

- step load to saturation;
- spike and recovery;
- sustained expected peak;
- backlog drain;
- hot publisher/Story;
- high-contention finalization/idempotency;
- dashboard/projector catch-up.

Load tests use synthetic fixtures and isolated quotas. Success includes safety invariants, not only throughput.

## Performance regression detection

Baselines are versioned by:

- source/test corpus;
- hardware/runtime;
- dependency lock;
- model/provider fake or approved integration;
- schema and algorithm versions.

Tracked results include latency distributions, memory, CPU, store operations, model calls, token accounting, queue depth, and artifact counts. Comparison uses noise-aware thresholds, minimum samples, and repeated trials. Regressions block release only under predeclared criteria.

## Long-running validation

Soak tests cover:

- memory/handle growth;
- cache and dedup index growth;
- queue fairness/starvation;
- metric cardinality;
- scheduled profile/window rollovers;
- Story dormancy/reactivation;
- retry storms and provider brownouts;
- clock/daylight-saving boundaries;
- retention and compaction behavior;
- reconciliation convergence.

State is sampled at stable intervals; test observation must not materially distort the system.

## Capacity planning

The model translates forecast source volume into:

- model calls and token budget by task;
- worker concurrency;
- Firestore reads/writes/transactions;
- queue depth and drain time;
- metric volume and retention;
- graph/index storage;
- cost;
- human review demand.

Capacity plans define normal, peak, degraded, and recovery modes with at least one agreed headroom target. They identify hard quotas and graceful-shedding order. Shedding Phase 5 derivation must not shed the frozen review/publication safety path.

## Future disaster recovery

### Objectives to decide

- recovery time objective by authoritative and derived data class;
- recovery point objective;
- backup frequency and retention;
- regional dependency strategy;
- secret and configuration recovery;
- artifact rebuild versus restore;
- operator access continuity;
- evidence preservation.

### Proposed recovery order

1. Restore identity, secrets, configuration, and authenticated operator access.
2. Verify authoritative source/run/analysis/review/publication integrity.
3. Restore the frozen processing and publication path.
4. Reconcile pending and partial states using supported mechanisms.
5. Rebuild or restore Phase 5 derived artifacts from immutable references.
6. Restore dashboards and noncritical projections.

Derived artifacts should be rebuildable where feasible. Authoritative reviews and publications require backup/restore assurance and cannot be inferred from metrics.

## Invariant catalog

Every scenario checks applicable invariants:

- invalid evidence is never accepted;
- Phase 4 call/retry/regeneration ceilings are unchanged;
- no partial output merge;
- no new run for internal recovery;
- readiness finalization is atomic/idempotent;
- no orphan analysis/review;
- no automatic approval/publication;
- publication is atomic/idempotent;
- deterministic IDs do not collide;
- Phase 5 derivation cannot mutate frozen records;
- suppression does not delete information;
- telemetry contains no forbidden data;
- faults are bounded and terminally classified.

## Verification classification

Reports use:

- `PASS`
- `FAIL`
- `NOT_EXECUTABLE_BY_DESIGN`
- `NOT_RUN`
- `BLOCKED`

Overall results use `PASS`, `PASS_WITH_VERIFICATION_LIMITATION`, `FAIL`, or `INCOMPLETE` under the existing protocol. Intentional production inaccessibility is documented with structural, test, and downstream evidence rather than mislabeled as an implementation failure.

## Release integration

Reliability capability is introduced incrementally:

1. deterministic unit/contract fixtures;
2. isolated simulator;
3. staging fault injection;
4. load and soak environments;
5. synthetic health observation;
6. disaster-recovery tabletop;
7. controlled recovery exercise.

No stage proceeds until environment isolation is proven.

## Acceptance criteria

- Production credentials and endpoints are unreachable from injection/replay harnesses.
- Fixed replay fixtures are identical across repeated runs.
- All seeded faults produce their typed expected outcomes.
- Sensitive fixture content cannot enter telemetry.
- Load/soak tests meet accepted safety, latency, and headroom criteria.
- Regression thresholds have reproducible baselines.
- Disaster-recovery evidence includes integrity checks and rollback.
- Reliability tools can be disabled without changing production behavior.

## Open questions

1. What sanitized fixture policy preserves realism without retaining prohibited content?
2. Which staging quotas and topology sufficiently represent production?
3. What headroom, RTO, and RPO targets are economically acceptable?
4. Should provider integration tests use a reserved account/model quota?
5. What environments may run approval/publication canaries?
6. How will production configuration drift be compared without copying secrets?
