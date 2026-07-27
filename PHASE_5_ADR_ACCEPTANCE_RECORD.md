# Phase 5 ADR Acceptance Record

## Record status

- Review date: 2026-07-27
- Scope: Phase 5.0 governance and entry evaluation for the deterministic offline Phase 5.1 foundation
- Baseline: `v1.0.0-rc1`
- Implementation status: Not started
- Decision authority: Role-based project governance
- Independent reviewer: Not currently assigned

The absence of an independent reviewer is a documented non-blocking limitation for documentation contracts and deterministic offline work. It becomes blocking before production persistence, production telemetry, model-assisted behavior, operator-facing behavior, deployment, or security-boundary changes.

Acceptance means the stated decision and limitations may guide the authorized offline implementation scope. It does not authorize production writes, schema changes, model calls, deployment, feature activation, approval, or publication.

## Summary

| Classification | ADRs |
|---|---|
| FOUNDATIONAL_BLOCKING | P5-ADR-001, P5-ADR-003, P5-ADR-006, P5-ADR-010, P5-ADR-012, P5-ADR-013 |
| MILESTONE_5_1_BLOCKING | P5-ADR-002, P5-ADR-005 |
| NON_BLOCKING_FOR_5_1 | P5-ADR-004, P5-ADR-011 |
| DEFERRED | P5-ADR-007, P5-ADR-008, P5-ADR-009, P5-ADR-014, P5-ADR-015 |

| Final status | ADRs |
|---|---|
| Accepted | P5-ADR-001, P5-ADR-004, P5-ADR-006, P5-ADR-013 |
| Accepted with documented limitations | P5-ADR-002, P5-ADR-003, P5-ADR-005, P5-ADR-010, P5-ADR-012 |
| Proposed — Not Accepted Yet | None |
| Deferred | P5-ADR-007, P5-ADR-008, P5-ADR-009, P5-ADR-011, P5-ADR-014, P5-ADR-015 |
| Rejected | None |

## Individual decisions

### P5-ADR-001 — Additive versioned derived artifacts

- **Prerequisite classification:** FOUNDATIONAL_BLOCKING
- **Final status:** Accepted
- **Accountable owner:** Architecture Owner
- **Reviewers:** Security and Privacy Owner; Data Governance Owner
- **Independent reviewer:** Not currently assigned — non-blocking for offline structures; blocking before production persistence
- **Decision rationale:** Additive immutable artifacts give the strongest Phase 4 compatibility and rollback boundary.
- **Accepted limitations:** Phase 5.1 defines envelopes and tests only; no database artifact is created.
- **Dependencies:** COMP-DATA-001 through COMP-DATA-007; P5-ADR-002 and P5-ADR-003
- **Associated risks:** Derived artifact platform; Deterministic identities; Provenance graph
- **Required exit evidence:** Contract tests proving no mutation of Phase 4 records and correct unknown-version failure.
- **Implementation authorization impact:** Permits offline envelope types and contract tests only.
- **Acceptance date:** 2026-07-27

### P5-ADR-002 — Deterministic identities and immutable Story Versions

- **Prerequisite classification:** MILESTONE_5_1_BLOCKING
- **Final status:** Accepted with documented limitations
- **Accountable owner:** Architecture Owner
- **Reviewers:** Data Governance Owner; Evaluation Owner
- **Independent reviewer:** Not currently assigned — non-blocking for offline source-fingerprint identity
- **Decision rationale:** Deterministic identity is required for reproducible fingerprints and artifact envelopes.
- **Accepted limitations:** Only source-fingerprint and generic artifact-envelope identity framing are authorized. Story, Story Version, Entity, graph-edge, split, and merge identities remain deferred.
- **Dependencies:** COMP-ID-007; accepted canonical serialization and version framing
- **Associated risks:** Deterministic identities; Source fingerprinting
- **Required exit evidence:** Cross-runtime golden vectors, namespace/version separation, and collision-policy tests.
- **Implementation authorization impact:** Permits deterministic offline ID/fingerprint functions for the approved scope.
- **Acceptance date:** 2026-07-27

### P5-ADR-003 — Provenance-linked claim and event graph

- **Prerequisite classification:** FOUNDATIONAL_BLOCKING
- **Final status:** Accepted with documented limitations
- **Accountable owner:** Architecture Owner
- **Reviewers:** Data Governance Owner; Security and Privacy Owner
- **Independent reviewer:** Not currently assigned — non-blocking for offline provenance structures
- **Decision rationale:** Provenance must exist before any derived source-intelligence artifact can be considered valid.
- **Accepted limitations:** Only generic source-input and derivation provenance structures and completeness validation are authorized. No Claim/Event graph, production graph store, or traversal service is authorized.
- **Dependencies:** P5-ADR-001; COMP-DATA-004
- **Associated risks:** Provenance graph; Relationship graph
- **Required exit evidence:** Fixtures showing complete, immutable references and rejection of missing/unknown provenance.
- **Implementation authorization impact:** Permits offline provenance structures and validators only.
- **Acceptance date:** 2026-07-27

### P5-ADR-004 — Source reputation is advisory and decomposed

- **Prerequisite classification:** NON_BLOCKING_FOR_5_1
- **Final status:** Accepted
- **Accountable owner:** Product and Editorial Owner
- **Reviewers:** Data Governance Owner; Architecture Owner
- **Independent reviewer:** Not currently assigned — non-blocking because reputation implementation is excluded
- **Decision rationale:** The trust/reputation separation is a governance invariant needed before later design.
- **Accepted limitations:** No reputation score, profile, trust change, or operator view is authorized in Phase 5.1.
- **Dependencies:** Operator-controlled publisher registry
- **Associated risks:** Publisher reputation; Reliability history
- **Required exit evidence:** Before later implementation, cohort/fairness review and authorization-isolation tests.
- **Implementation authorization impact:** Establishes a prohibition; authorizes no reputation implementation.
- **Acceptance date:** 2026-07-27

### P5-ADR-005 — Conservative duplicate and canonicalization model

- **Prerequisite classification:** MILESTONE_5_1_BLOCKING
- **Final status:** Accepted with documented limitations
- **Accountable owner:** Architecture Owner
- **Reviewers:** Evaluation Owner; Data Governance Owner
- **Independent reviewer:** Not currently assigned — non-blocking for offline deterministic rules
- **Decision rationale:** Conservative normalization and conflict preservation minimize destructive false merges.
- **Accepted limitations:** Canonical URL normalization, fingerprinting, exact-identity fixtures, and conflict contracts only. Near-duplicate classification, clustering, ranking, and production suppression are excluded.
- **Dependencies:** COMP-ID-001 through COMP-ID-007; THR-URL and THR-FP metrics
- **Associated risks:** Exact duplicate detection; Near-duplicate detection; URL canonicalization
- **Required exit evidence:** Canonical URL corpus results, zero critical false merges, fingerprint golden vectors, and determinism tests.
- **Implementation authorization impact:** Permits offline pure normalization, canonicalization, and fingerprinting work only.
- **Acceptance date:** 2026-07-27

### P5-ADR-006 — NFC-only exact evidence boundary remains authoritative

- **Prerequisite classification:** FOUNDATIONAL_BLOCKING
- **Final status:** Accepted
- **Accountable owner:** Security and Privacy Owner
- **Reviewers:** Architecture Owner; Evaluation Owner
- **Independent reviewer:** Not currently assigned — non-blocking because this preserves an already verified baseline
- **Decision rationale:** Semantic or compatibility normalization would weaken the frozen grounding contract.
- **Accepted limitations:** None; the rule is absolute for Phase 5.
- **Dependencies:** v1.0.0-rc1 evidence validator
- **Associated risks:** Event extraction; AI Radar summaries
- **Required exit evidence:** Phase 4 regression tests remain passing with zero acceptance relaxation.
- **Implementation authorization impact:** Constrains all work; authorizes no new evidence behavior.
- **Acceptance date:** 2026-07-27

### P5-ADR-007 — Provider-neutral model task envelope

- **Prerequisite classification:** DEFERRED
- **Final status:** Deferred
- **Accountable owner:** Architecture Owner
- **Reviewers:** Security and Privacy Owner; Operations Owner
- **Independent reviewer:** Not currently assigned — blocking before model-assisted implementation
- **Decision rationale:** Phase 5.1 permits no model calls, so accepting a provider execution contract would be premature.
- **Accepted limitations:** Not applicable.
- **Dependencies:** Future model, cost, privacy, and recovery decisions
- **Associated risks:** Multi-model compatibility
- **Required exit evidence:** Provider contract suite, explicit budgets, privacy boundary, and recovery table.
- **Implementation authorization impact:** No model-assisted implementation is authorized.
- **Reason not accepted:** Outside milestone 5.1 and insufficient provider-specific evidence.

### P5-ADR-008 — Confidence and coverage are separate calibrated outputs

- **Prerequisite classification:** DEFERRED
- **Final status:** Deferred
- **Accountable owner:** Evaluation Owner
- **Reviewers:** Product and Editorial Owner; Architecture Owner
- **Independent reviewer:** Not currently assigned — blocking before calibration is operator-visible
- **Decision rationale:** The conceptual separation is sound, but no labeled calibration corpus exists.
- **Accepted limitations:** Not applicable.
- **Dependencies:** Analysis Intelligence corpus and editorial rubric
- **Associated risks:** Confidence estimation; Coverage estimation
- **Required exit evidence:** Calibration corpus, Brier/reliability targets, and cohort review.
- **Implementation authorization impact:** Confidence and coverage implementation is not authorized.
- **Reason not accepted:** Outside milestone 5.1 and empirically unresolved.

### P5-ADR-009 — Explainable, human-advisory editorial scoring

- **Prerequisite classification:** DEFERRED
- **Final status:** Deferred
- **Accountable owner:** Product and Editorial Owner
- **Reviewers:** Evaluation Owner; Security and Privacy Owner
- **Independent reviewer:** Not currently assigned — blocking before operator-facing activation
- **Decision rationale:** Editorial policy and labeled judgments do not yet exist.
- **Accepted limitations:** Not applicable.
- **Dependencies:** Accepted Analysis Intelligence contracts and editorial policy
- **Associated risks:** Story ranking; Breaking-news logic; AI Radar summaries
- **Required exit evidence:** Policy ownership, fairness review, explanation completeness, and zero publication authority tests.
- **Implementation authorization impact:** Editorial implementation is not authorized.
- **Reason not accepted:** Outside milestone 5.1.

### P5-ADR-010 — Append-only bounded operational events

- **Prerequisite classification:** FOUNDATIONAL_BLOCKING
- **Final status:** Accepted with documented limitations
- **Accountable owner:** Operations Owner
- **Reviewers:** Security and Privacy Owner; Architecture Owner
- **Independent reviewer:** Not currently assigned — non-blocking offline; blocking before production telemetry
- **Decision rationale:** An allowlisted event contract is necessary before the offline harness emits diagnostics.
- **Accepted limitations:** Offline evaluation events only. No production emitter, store, metric projector, dashboard, alert, or new production field is authorized.
- **Dependencies:** `PHASE_5_PRIVACY_AND_TELEMETRY_CONTRACT.md`
- **Associated risks:** Operational telemetry; Pipeline/queue dashboards
- **Required exit evidence:** Telemetry allowlist tests, forbidden-content tests, bounds/cardinality tests.
- **Implementation authorization impact:** Permits test-local bounded diagnostic records only.
- **Acceptance date:** 2026-07-27

### P5-ADR-011 — View-only duplicate suppression

- **Prerequisite classification:** NON_BLOCKING_FOR_5_1
- **Final status:** Deferred
- **Accountable owner:** Product and Editorial Owner
- **Reviewers:** Architecture Owner; Evaluation Owner
- **Independent reviewer:** Not currently assigned — blocking before suppression is operator-visible
- **Decision rationale:** Lossless reversible behavior remains required, but Phase 5.1 includes no production suppression or ranking.
- **Accepted limitations:** Not applicable.
- **Dependencies:** Story identity, novelty, conflict validation, editorial policy
- **Associated risks:** Duplicate-story suppression
- **Required exit evidence:** Seeded update/conflict visibility and reversible projection tests.
- **Implementation authorization impact:** No suppression implementation is authorized.
- **Reason not accepted:** No Phase 5.1 dependency.

### P5-ADR-012 — Isolated replay and fault-injection boundary

- **Prerequisite classification:** FOUNDATIONAL_BLOCKING
- **Final status:** Accepted with documented limitations
- **Accountable owner:** Reliability Owner
- **Reviewers:** Security and Privacy Owner; Architecture Owner
- **Independent reviewer:** Not currently assigned — non-blocking for local harness; blocking before staged fault injection
- **Decision rationale:** The corpus harness must be unable to reach production or require a production replay endpoint.
- **Accepted limitations:** Deterministic offline corpus execution only. Fault injection, staging orchestration, production data, production credentials, and production endpoints remain excluded.
- **Dependencies:** Corpus governance and milestone scope
- **Associated risks:** Replay simulator; Fault injection; Synthetic canaries
- **Required exit evidence:** Tests proving no network/production repository dependency and reproducible fixture execution.
- **Implementation authorization impact:** Permits a local/offline evaluation harness only.
- **Acceptance date:** 2026-07-27

### P5-ADR-013 — Logical clocks and deterministic cutoffs

- **Prerequisite classification:** FOUNDATIONAL_BLOCKING
- **Final status:** Accepted
- **Accountable owner:** Architecture Owner
- **Reviewers:** Evaluation Owner; Reliability Owner
- **Independent reviewer:** Not currently assigned — non-blocking for deterministic offline work
- **Decision rationale:** Reproducibility requires injected time and stable ordering from the first harness.
- **Accepted limitations:** Phase 5.1 uses logical time only in test/envelope metadata; it creates no production scheduler.
- **Dependencies:** Corpus reproducibility contract
- **Associated risks:** Deterministic identities; Performance regression
- **Required exit evidence:** Repeated-run equality under fixed inputs, clock, and versions.
- **Implementation authorization impact:** Permits injected logical clocks in offline components.
- **Acceptance date:** 2026-07-27

### P5-ADR-014 — Embeddings are candidate-generation features only

- **Prerequisite classification:** DEFERRED
- **Final status:** Deferred
- **Accountable owner:** Architecture Owner
- **Reviewers:** Security and Privacy Owner; Evaluation Owner
- **Independent reviewer:** Not currently assigned — blocking before embedding use
- **Decision rationale:** Phase 5.1 prohibits model calls and does not need embeddings.
- **Accepted limitations:** Not applicable.
- **Dependencies:** Provider/privacy approval and near-duplicate evaluation
- **Associated risks:** Near-duplicate detection; Multi-model compatibility
- **Required exit evidence:** Provider boundary, retention decision, drift tests, and deterministic non-embedding fallback.
- **Implementation authorization impact:** Embeddings are not authorized.
- **Reason not accepted:** Outside milestone 5.1.

### P5-ADR-015 — Rebuildable derived state and tiered disaster recovery

- **Prerequisite classification:** DEFERRED
- **Final status:** Deferred
- **Accountable owner:** Reliability Owner
- **Reviewers:** Operations Owner; Data Governance Owner
- **Independent reviewer:** Not currently assigned — blocking before disaster-recovery activation
- **Decision rationale:** Offline Phase 5.1 writes no production state; RTO/RPO decisions require later capacity and storage evidence.
- **Accepted limitations:** Not applicable.
- **Dependencies:** Persistence design, retention, capacity, RTO/RPO ownership
- **Associated risks:** Disaster recovery
- **Required exit evidence:** Tabletop, isolated restore, integrity checks, and approved RTO/RPO.
- **Implementation authorization impact:** No disaster-recovery implementation is authorized.
- **Reason not accepted:** Outside milestone 5.1.

## Acceptance conclusion

All ADRs blocking the deterministic offline Phase 5.1 scope have an explicit accepted status and bounded implementation impact. Deferred ADRs cannot be used as implied authorization. The gate must still evaluate ownership, contracts, thresholds, risks, and scope independently.
