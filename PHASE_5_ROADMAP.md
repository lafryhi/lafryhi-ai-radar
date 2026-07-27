# LAFRYHI AI Radar Phase 5 Roadmap

## Status and sequencing rule

This roadmap is proposed and has not authorized implementation. It builds on frozen v1.0.0-rc1 behavior. Each milestone starts with contracts and offline evaluation, proceeds through shadow mode, and requires an explicit acceptance decision before advisory activation.

## Shared milestone constraints

Every milestone must:

- preserve exact evidence grounding after NFC and deterministic whitespace normalization only;
- preserve Phase 4 recovery ceilings and immutable inputs;
- remain unable to approve or publish;
- use additive, versioned derived artifacts;
- retain provenance and conflicting information;
- emit bounded, allowlisted telemetry;
- support independent rollback to v1.0.0-rc1 behavior;
- distinguish `PASS`, `FAIL`, `NOT_EXECUTABLE_BY_DESIGN`, `NOT_RUN`, and `BLOCKED`.

## Phase 5.0 — Contracts and evaluation foundation

### Purpose

Remove ambiguity before feature implementation by defining identities, versioning, provenance, privacy, ownership, evaluation corpora, and shadow-mode controls.

### Deliverables

- Accepted foundational ADRs.
- Phase 5 derived-artifact envelope and schema conventions.
- Stable terminology and deterministic identity rules.
- Data classification and telemetry allowlist.
- Labeled fixture/corpus governance.
- Phase 4 regression boundary suite design.
- Milestone control and rollback contract.

### Dependencies

- v1.0.0-rc1 baseline and its production-readiness evidence.
- Existing repository and service boundaries.
- Product, editorial, security, operations, and data-governance owners.

### Acceptance criteria

- No unresolved ambiguity about authoritative versus derived data.
- Every proposed artifact has an owner, input provenance, retention class, and version strategy.
- No design requires rewriting baseline records.
- Evaluation datasets have permitted use, labels, and reproducible versions.
- Privacy review approves telemetry fields and fixture handling.

### Rollback considerations

This milestone is documentation and test-foundation work. Rollback means rejecting or superseding proposed contracts before production persistence exists.

### Estimated implementation complexity

Medium. Cross-functional decisions dominate; runtime risk is low.

## Phase 5.1 — Source Intelligence

### Purpose

Create deterministic, explainable observations about source identity, reliability, language, duplication, independence, and conflict.

### Deliverables

- Versioned source and publisher fingerprints.
- URL canonicalization and normalization policy.
- Language identification with uncertainty.
- Exact-duplicate and conservative near-duplicate signals.
- Publisher clustering and common-origin observations.
- Source reliability history and advisory reputation profile.
- Cross-source agreement/conflict observations.
- Shadow evaluation and operator explanation views.

### Dependencies

- Phase 5.0 artifact, provenance, telemetry, and corpus contracts.
- Immutable `SourceRecord` identifiers and source snapshots.
- Publisher registry metadata.

### Acceptance criteria

- Exact duplicate precision is at least 99.9% on the accepted corpus.
- Near-duplicate precision is at least 98% before advisory activation.
- Conflicting records remain visible and are never discarded.
- Canonical URL false-merge rate is below 0.1%.
- Supported-language macro F1 is at least 0.97.
- Reputation cannot change publisher authorization or review state.
- Every score exposes samples, uncertainty, algorithm version, and component observations.

### Rollback considerations

Disable Source Intelligence consumers and stop new profile versions. Existing source records remain untouched; operator behavior falls back to baseline source metadata.

### Estimated implementation complexity

High. Multilingual normalization, syndication, and false-merge control require substantial evaluation.

## Phase 5.2 — Analysis Intelligence

### Purpose

Transform validated per-article analyses into provenance-linked event, entity, claim, story, timeline, novelty, coverage, confidence, and relationship intelligence.

### Deliverables

- Event and claim extraction contracts.
- Entity mention and conservative resolution model.
- Timeline and temporal uncertainty representation.
- Cross-source comparison and contradiction detection.
- Calibrated confidence and separate coverage estimates.
- Story identity, immutable Story Versions, and membership explanations.
- Novelty scoring and reversible duplicate-story suppression.
- Provenance-aware relationship graph.
- Provider-neutral model-task interface and deterministic validator contract.

### Dependencies

- Accepted Phase 5.0 contracts.
- Accepted Source Intelligence identities, fingerprints, and independence observations.
- Frozen validated `AnalysisResult` and evidence provenance.

### Acceptance criteria

- All material event fields and graph edges trace to accepted evidence.
- Entity and story false merges remain below approved risk-specific thresholds.
- Contradiction precision reaches at least 95% before operator exposure.
- Story grouping precision reaches at least 97% before advisory suppression.
- Confidence is calibrated and never substituted for coverage.
- Cross-source agreement cannot validate a quote rejected by the Phase 4 evidence validator.
- A second model provider cannot bypass the same output validation.

### Rollback considerations

Stop new event/story versions and hide Analysis Intelligence read models. Validated analyses, reviews, and publications remain authoritative and unchanged.

### Estimated implementation complexity

Very high. Temporal reasoning, resolution, contradiction scope, and story identity are the program's central technical risks.

## Phase 5.3 — Editorial Intelligence

### Purpose

Provide operators with transparent, reversible, evidence-grounded editorial prioritization and narrative products without automating editorial decisions.

### Deliverables

- Explainable story ranking and importance scores.
- Editorial-priority policy with versioned weights.
- Breaking-news eligibility and decay logic.
- Story lifecycle and long-running-story tracking.
- Topic evolution views.
- AI Radar summary, digest, and weekly report specifications.
- Duplicate-story view suppression with source-diversity preservation.
- Operator feedback and adjudication audit design.

### Dependencies

- Stable Story Version, novelty, coverage, contradiction, and confidence contracts from Phase 5.2.
- Source independence and reliability observations from Phase 5.1.
- Phase 5.0 policy ownership and telemetry controls.

### Acceptance criteria

- Every visible score lists component values, exclusions, weights, and version.
- No score or lifecycle transition approves or publishes.
- Every generated statement traces to validated evidence.
- Breaking-news alerts meet accepted precision and expiry targets.
- Suppression never deletes a story, event, analysis, or source.
- Digest/report evaluations show zero unsupported claims in the acceptance corpus.
- Operator overrides are explicit and auditable.

### Rollback considerations

Disable Phase 5 ordering and generated editorial products. Restore baseline queue ordering and operator views without altering review decisions or publications.

### Estimated implementation complexity

High. Editorial policy, explainability, and generated synthesis require close human evaluation.

## Phase 5.4 — Operational Intelligence

### Purpose

Make system cost, performance, quality, recovery, queues, operator actions, and outcomes observable through privacy-safe and reconcilable metrics.

### Deliverables

- Versioned operational event dictionary.
- Gemini usage and estimated-cost views.
- Pipeline-duration and recovery dashboards.
- Source-quality and publication metrics.
- Operator-action and approval-latency views.
- Queue-health, throughput, and error-classification views.
- Trend monitoring, anomaly alerts, and runbooks.
- Metric reconciliation and retention controls.

### Dependencies

- Telemetry allowlist and event envelope from Phase 5.0.
- Stable event emissions from Phases 5.1 through 5.3.
- Existing Phase 4 safe recovery/finalization telemetry.

### Acceptance criteria

- Dashboards contain no source text, evidence quote, raw output, prompt body, credentials, secrets, or mismatching characters.
- Sampled metrics reconcile with authoritative run and review states.
- Cost is labeled estimated where provider accounting is incomplete.
- Metric cardinality and retention remain within approved bounds.
- Alerts have tested thresholds, owners, and runbooks.
- Dashboard failure cannot block the production pipeline.

### Rollback considerations

Disable metric projectors, alerts, or dashboards independently. Production processing continues; raw safe events are retained according to policy for later reconciliation.

### Estimated implementation complexity

Medium to high. Aggregation is straightforward; privacy, cardinality, accounting, and reconciliation are the primary risks.

## Phase 5.5 — Reliability Evolution

### Purpose

Establish repeatable evidence that the intelligence pipeline remains safe under faults, scale, long runtimes, provider changes, and recovery scenarios.

### Deliverables

- Deterministic pipeline replay simulator using sanitized fixtures.
- Synthetic canary catalog and scheduler design.
- Fault-injection and chaos-test harness.
- Load, soak, and capacity-testing plans.
- Performance-regression baselines and detection.
- Long-running invariant validation.
- Disaster-recovery objectives, evidence preservation, and exercise plan.
- Reliability scorecard for release gates.

### Dependencies

- Phase 5.0 test-boundary, fixture, privacy, and identity contracts.
- Stable contracts from each capability being exercised.
- Isolated environments without production write credentials.

### Acceptance criteria

- Replay is deterministic for fixed fixtures, clocks, and versions.
- Fault injection cannot reach production.
- Synthetic canaries cannot approve or publish.
- Load and soak testing demonstrate accepted headroom and no safety-invariant breach.
- Regression alerts distinguish product failures from environment blockage and verification limitations.
- Disaster-recovery exercises preserve evidence and never delete partial diagnostic records.

### Rollback considerations

Stop schedulers and test harnesses, revoke their isolated credentials, and retain reports. No production record cleanup is required because production writes are prohibited.

### Estimated implementation complexity

High. Safe isolation, representative fixtures, deterministic time, and failure orchestration require careful engineering.

## Program dependency map

```text
Phase 5.0 Contracts
    |
    +--> Phase 5.1 Source Intelligence
    |          |
    |          v
    +--> Phase 5.2 Analysis Intelligence
    |          |
    |          v
    +--> Phase 5.3 Editorial Intelligence
    |
    +--> Phase 5.4 Operational event foundation
    |          ^
    |          +--- stable signals from 5.1, 5.2, and 5.3
    |
    +--> Phase 5.5 Reliability foundation
               ^
               +--- stable contracts from every exercised milestone
```

Operational and reliability foundations begin in Phase 5.0, but they do not validate or visualize a domain capability before that capability's contract is stable.

## Recommended release slices

1. 5.0 contracts and evaluation foundation.
2. 5.1a deterministic normalization, canonical URL, and exact fingerprints.
3. 5.1b language, near-duplicate, clustering, conflict, and advisory reputation.
4. 5.2a events, claims, mentions, and provenance.
5. 5.2b resolution, comparison, contradiction, confidence, and coverage.
6. 5.2c Story Versions, novelty, suppression, and relationship graph.
7. 5.3a ranking, priority, lifecycle, and breaking-news shadow mode.
8. 5.3b summaries, digests, reports, and operator feedback.
9. 5.4 metric projections, dashboards, reconciliation, and alerts.
10. 5.5 replay, synthetic canaries, chaos, load, soak, capacity, and disaster-recovery exercises.
