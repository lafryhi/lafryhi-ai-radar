# Phase 5 Risk-Minimized Implementation Order

## Status

This is an engineering sequence, not authorization to implement. Each step requires its prerequisites and acceptance evidence. No step may modify the frozen v1.0.0-rc1 behavior unless a later explicitly accepted release gate authorizes a bounded advisory integration.

## Sequencing rules

1. Contracts precede persistence and model calls.
2. Pure deterministic functions precede asynchronous workers.
3. Offline evidence precedes production shadow computation.
4. Shadow outputs precede operator-visible advice.
5. Operator-visible advice precedes any queue-order influence.
6. No Phase 5 output may approve or publish.
7. Every slice has an independent stop/rollback control.
8. Operational events and reliability fixtures are built alongside each domain slice, not retrofitted after activation.

## Step 1 — Freeze and automate the compatibility boundary

**Prerequisites**

- v1.0.0-rc1 tag, release baseline, and Phase 4 verification evidence.

**Outputs**

- Machine-readable inventory of frozen contracts.
- Regression scenarios for evidence validation, recovery ceilings, deterministic IDs, readiness finalization, human review, and atomic publication.
- Explicit forbidden-mutation list.

**Required validation**

- Existing 190/190 baseline tests remain passing.
- Tests prove Phase 5 modules cannot change frozen records.
- Exact evidence and Phase 4 ceiling golden cases are captured.

**Rollback point**

- Documentation/test-foundation commit can be reverted without runtime effect.

**Next dependency**

- Step 2 uses the frozen boundary to approve Phase 5 contracts.

## Step 2 — Resolve foundational ADRs and ownership

**Prerequisites**

- Step 1 boundary inventory.
- Product, editorial, security, operations, reliability, and data-governance owners.

**Outputs**

- Accepted/rejected/superseded decisions for P5-ADR-001, 002, 003, 006, 010, 012, and 013.
- Named risk owners.
- Data classification, retention classes, and policy-change process.

**Required validation**

- Architecture review finds no baseline contradiction.
- Security/privacy review approves boundaries.
- Every P0 risk has an owner and measurable exit.

**Rollback point**

- Reject proposals before persistence or runtime dependencies exist.

**Next dependency**

- Step 3 formalizes the accepted artifact and event contracts.

## Step 3 — Define artifact, provenance, and operational-event contracts

**Prerequisites**

- Accepted foundational ADRs.

**Outputs**

- Versioned schemas for derived artifact envelope, provenance references, logical cutoff, lifecycle, and safe operational events.
- Canonical serialization and deterministic identity specification.
- Compatibility/read-version rules.

**Required validation**

- Schema fixtures and golden identity vectors.
- Field-level privacy/cardinality review.
- Unknown-version and malformed-artifact rejection tests.
- No schema overlaps or ID collisions with Phase 4 namespaces.

**Rollback point**

- Withdraw schema version before any producer is activated.

**Next dependency**

- Step 4 creates reproducible evaluation material using these contracts.

## Step 4 — Establish evaluation corpora and deterministic harness

**Prerequisites**

- Step 3 contracts.
- Approved fixture licensing, privacy, and retention.

**Outputs**

- Versioned multilingual labeled corpora.
- Synthetic adversarial Unicode, URL, duplicate, conflict, temporal, and provider-failure cases.
- Logical clock, fixed random seed, deterministic fake providers, and adapter contract harness.

**Required validation**

- Fixture provenance and privacy audit.
- Repeated execution produces identical semantic outputs.
- No production endpoint or credential is reachable.

**Rollback point**

- Revoke/rebuild fixture corpus; no production artifacts exist.

**Next dependency**

- Step 5 implements pure source normalization against fixed labels.

## Step 5 — Build pure source normalization and canonical URL library

**Prerequisites**

- Steps 3–4.
- Accepted P5-ADR-005.

**Outputs**

- Versioned, pure normalization functions.
- Conservative URL canonicalization and conflict results.
- Original-versus-derived field preservation.

**Required validation**

- Golden Unicode/URL corpus.
- Locale-independent repeatability across supported runtimes.
- Canonical URL false-merge rate below 0.1%.
- No mutation of existing `SourceRecord`.

**Rollback point**

- Disable/unpublish the new normalization version.

**Next dependency**

- Step 6 fingerprints the stable normalized representations.

## Step 6 — Build source fingerprint families and exact duplicate classifier

**Prerequisites**

- Stable Step 5 normalization version.
- Approved fingerprint privacy policy.

**Outputs**

- Versioned fetch, extracted, canonical-content, URL, and publisher fingerprints.
- Exact duplicate and identity-conflict classifier.

**Required validation**

- At least 99.9% exact-duplicate precision.
- Conflicts are detected before representative selection.
- All records and provenance remain present.
- Short evidence-derived hashes are impossible.

**Rollback point**

- Stop the fingerprint producer; no baseline read path depends on it.

**Next dependency**

- Step 7 uses fingerprints for conservative candidate generation.

## Step 7 — Add language, near-duplicate, and publisher-cluster observations

**Prerequisites**

- Steps 5–6.
- Accepted P5-ADR-014 if embeddings are used.

**Outputs**

- Language/script/mixed/uncertain results.
- Near-duplicate candidate and final classification stages.
- Versioned publisher/common-origin cluster hypotheses.

**Required validation**

- Supported-language macro F1 at least 0.97.
- Near-duplicate precision at least 98%.
- Seeded updates, corrections, conflicts, and distinct perspectives remain separate.
- Common-origin estimates do not become truth or authorization.

**Rollback point**

- Disable each classifier independently and retain exact identity only.

**Next dependency**

- Step 8 aggregates validated observations into advisory profiles.

## Step 8 — Add conflict/corroboration observations and advisory reputation

**Prerequisites**

- Steps 6–7.
- Accepted P5-ADR-004.

**Outputs**

- Comparable source observations.
- Common-origin-adjusted corroboration and conflict history.
- Sample-aware Source Intelligence Profiles.

**Required validation**

- Sparse-data and uncertainty behavior.
- No publisher trust/status mutation.
- Platform/model failure attribution tests.
- Syndicated misinformation does not inflate corroboration.
- Cohort/fairness and policy review.

**Rollback point**

- Stop new profile versions and hide advisory profile views.

**Next dependency**

- Step 9 verifies Source Intelligence in shadow before Analysis Intelligence consumes its accepted contract.

## Step 9 — Source Intelligence shadow gate

**Prerequisites**

- Steps 5–8 and all P5-1 acceptance evidence.

**Outputs**

- Production shadow observations for a bounded source cohort.
- Precision sampling, drift, cost, latency, privacy, and rollback reports.

**Required validation**

- Phase 4 outputs and operator behavior are byte/semantically unchanged as applicable.
- No protected telemetry.
- Source milestone metrics meet thresholds.
- Stop control tested.

**Rollback point**

- Disable all Source Intelligence production consumers; preserve diagnostic artifacts.

**Next dependency**

- Step 10 consumes only the accepted source contract.

## Step 10 — Implement grounded Claim and Extracted Event contracts

**Prerequisites**

- Steps 3–4 and accepted Source Intelligence contract.
- Accepted P5-ADR-003, 006, and 007.

**Outputs**

- Claim, Event, evidence-reference, and provenance validators.
- Complete-object model task envelope with explicit Phase 5 budget.
- Immutable Event versions.

**Required validation**

- Zero unsupported material fields in the acceptance corpus.
- Exact evidence behavior matches frozen contract.
- Partial output is never merged.
- Model/provider failures cannot affect review/publication.

**Rollback point**

- Disable the Event producer; validated Phase 4 analyses remain usable.

**Next dependency**

- Step 11 builds entity and temporal structure over grounded Events.

## Step 11 — Implement Entity mentions/resolution and temporal model

**Prerequisites**

- Step 10 grounded artifacts.

**Outputs**

- Mention extraction, Entity resolution hypotheses, alternatives/conflicts.
- Temporal precision, intervals, and constraint validation.
- Versioned split/merge lineage.

**Required validation**

- Risk-specific entity false-merge thresholds.
- Same-name conflicting entities never auto-merge.
- Timeline fixtures preserve timezone and precision.
- Deterministic ordering and logical clocks.

**Rollback point**

- Fall back to unresolved mentions and unordered Events; no data deletion.

**Next dependency**

- Step 12 compares compatible structured Claims.

## Step 12 — Implement comparison, contradiction, confidence, and coverage

**Prerequisites**

- Steps 8, 10, and 11.
- Accepted P5-ADR-008.

**Outputs**

- Claim compatibility/comparison engine.
- Contradiction/discrepancy artifacts.
- Separately calibrated confidence and coverage assessments.

**Required validation**

- Contradiction precision at least 95%.
- Non-comparable and corrected claims are not false contradictions.
- Calibration evidence and cohort reports.
- Syndicated copies do not raise independent support or coverage.

**Rollback point**

- Hide comparison assessments and retain base Events/Claims.

**Next dependency**

- Step 13 groups compatible Events into versioned Stories.

## Step 13 — Implement Story identity, versions, novelty, and graph

**Prerequisites**

- Steps 10–12.

**Outputs**

- Stable Story identity and immutable Story Versions.
- Membership explanations, split/merge lineage.
- Novelty scores with fixed prior snapshots.
- Bounded provenance relationship graph.

**Required validation**

- Story grouping precision at least 97%.
- Novelty fixtures distinguish copies, updates, corrections, and conflicts.
- Graph edges have provenance; traversal is bounded.
- Fixed replay is deterministic.

**Rollback point**

- Stop Story versions; retain Events independently.

**Next dependency**

- Step 14 implements reversible view suppression.

## Step 14 — Implement duplicate-story view suppression

**Prerequisites**

- Step 13.
- Accepted P5-ADR-011.

**Outputs**

- Versioned suppression relationship and visible-story projection.
- Operator explanation/reversal contract.

**Required validation**

- Integrity and conflict validation always precede suppression.
- Updates, corrections, contradictions, and novel coverage defeat suppression.
- Underlying artifacts remain queryable.
- No review/publication change.

**Rollback point**

- Ignore suppression projection and display all Stories.

**Next dependency**

- Step 15 completes the Analysis Intelligence shadow gate.

## Step 15 — Analysis Intelligence shadow gate

**Prerequisites**

- Steps 10–14 and P5-2 acceptance evidence.

**Outputs**

- Bounded shadow outputs and evaluation report.
- Multi-model compatibility report if more than one provider is evaluated.

**Required validation**

- Provenance completeness.
- Thresholds for events, entities, contradictions, Stories, novelty, confidence, and coverage.
- Cost/call ceilings and privacy audit.
- No frozen-path behavioral change.

**Rollback point**

- Disable all Analysis Intelligence processors and readers.

**Next dependency**

- Step 16 defines editorial policy over accepted Story contracts.

## Step 16 — Approve editorial policy, score semantics, and lifecycle

**Prerequisites**

- Accepted P5-2 contract and labeled editorial judgments.
- Accepted P5-ADR-009.

**Outputs**

- Versioned scoring weights/rules.
- Importance, priority, urgency, breaking, and lifecycle definitions.
- Missing-signal and operator-override policy.

**Required validation**

- Editorial, fairness, security, and explainability review.
- Every component has an owner and definition.
- No state transition path to approval/publication exists.

**Rollback point**

- Reject/supersede the policy version before operator exposure.

**Next dependency**

- Step 17 calculates advisory assessments.

## Step 17 — Implement ranking, priority, breaking, and lifecycle in shadow

**Prerequisites**

- Step 16.

**Outputs**

- Deterministic Editorial Assessments.
- Ranked/suppressed read projection.
- Breaking eligibility/expiry and Story lifecycle proposals.

**Required validation**

- Explanation completeness and fixed-cutoff determinism.
- Breaking precision/expiry thresholds.
- Seeded disputed Stories remain visible.
- Baseline queue remains available and unchanged.

**Rollback point**

- Disable Editorial Assessment reads; use baseline ordering.

**Next dependency**

- Step 18 adds grounded narrative products.

## Step 18 — Implement summaries, digests, and weekly reports as drafts

**Prerequisites**

- Step 17 and complete product schemas.

**Outputs**

- Evidence-linked AI Radar summaries.
- Internal digest and weekly-report drafts.
- Topic-evolution and long-running-Story views.

**Required validation**

- Zero unsupported claims in the acceptance corpus.
- Cutoff, contradiction, and lifecycle consistency.
- Complete-object validation and explicit budgets.
- Drafts cannot enter publication automatically.

**Rollback point**

- Disable generated drafts while retaining structured Editorial Assessments.

**Next dependency**

- Step 19 completes operator advisory evaluation.

## Step 19 — Editorial advisory gate

**Prerequisites**

- Steps 16–18 and P5-3 acceptance evidence.

**Outputs**

- Bounded operator cohort feedback.
- Ranking, suppression, breaking, and factuality evaluation.

**Required validation**

- All executable safety/user-facing checks pass.
- Operator overrides are audited.
- No automatic approval/publication.
- Baseline queue fallback tested.

**Rollback point**

- Remove Phase 5 views and restore baseline operator presentation.

**Next dependency**

- Step 20 promotes stable operational projections.

## Step 20 — Implement operational projections and reconciliation

**Prerequisites**

- Step 3 event contract and stable domain event versions from prior steps.

**Outputs**

- Idempotent metric projectors.
- Usage, estimated cost, duration, recovery, source, publication, operator, queue, approval-latency, throughput, and error aggregates.
- Reconciliation jobs and completeness indicators.

**Required validation**

- Duplicate event delivery does not double-count.
- Sample metrics reconcile with authoritative state.
- Privacy, retention, and cardinality audits pass.
- Projector outage does not block processing.

**Rollback point**

- Stop projectors and rebuild later from retained safe events.

**Next dependency**

- Step 21 makes vetted projections visible and actionable.

## Step 21 — Release dashboards, trends, alerts, and runbooks

**Prerequisites**

- Step 20 reconciled aggregates.

**Outputs**

- Read-only dashboards.
- Deterministic trend monitors.
- Shadow-tested then active alerts and incident runbooks.

**Required validation**

- Dashboard definitions reproduce fixture results.
- Cost limitations and accounting coverage are visible.
- Alert precision, ownership, cooldown, and runbook exercises pass.
- Dashboard removal has no pipeline effect.

**Rollback point**

- Disable individual dashboards/alerts; leave pipeline and safe events intact.

**Next dependency**

- Step 22 builds isolated replay over stable contracts.

## Step 22 — Implement isolated replay simulator

**Prerequisites**

- Accepted P5-ADR-012.
- Stable fixture and artifact contracts.

**Outputs**

- Sanitized-fixture replay with fake providers, logical clocks, isolated repositories, state diffs, and invariant reports.

**Required validation**

- Production networks/credentials are unreachable.
- Repeated fixed runs are identical.
- No raw production model output is required.
- Verification statuses are applied correctly.

**Rollback point**

- Disable simulator execution and revoke its isolated identity.

**Next dependency**

- Step 23 introduces controlled failures.

## Step 23 — Implement synthetic canaries and fault injection

**Prerequisites**

- Step 22 isolation proof.

**Outputs**

- Versioned synthetic catalog.
- Test-only provider/repository/clock/queue injection adapters.
- Seeded expected-outcome scenarios.

**Required validation**

- Injection cannot compile/activate or authenticate against production, per accepted design.
- Every fault has typed bounded recovery and terminal outcome.
- Canaries cannot approve/publish or enter business metrics.

**Rollback point**

- Stop schedulers, revoke test identity, retain reports.

**Next dependency**

- Step 24 exercises scale and duration.

## Step 24 — Execute load, soak, and performance-regression program

**Prerequisites**

- Steps 20–23.
- Isolated quotas and cost caps.

**Outputs**

- Peak, spike, backlog-drain, contention, soak, and version-comparison reports.
- Resource and latency baselines.

**Required validation**

- Accepted headroom and service-level targets.
- No safety-invariant violation at saturation.
- No unbounded memory, queue, graph, or telemetry growth.
- Seeded regressions are detected reproducibly.

**Rollback point**

- Stop workloads and release isolated resources without touching production.

**Next dependency**

- Step 25 converts measurements into capacity/DR plans.

## Step 25 — Approve capacity and disaster-recovery design

**Prerequisites**

- Step 24 measurements.
- Accepted P5-ADR-015.

**Outputs**

- Forecast model, degraded-mode order, headroom target.
- Tiered RTO/RPO, backup/rebuild design, integrity checks, and exercise plan.

**Required validation**

- Tabletop covers provider outage, persistence outage, telemetry incident, and regional dependency loss.
- Frozen authoritative state restores before derived state.
- Evidence and partial diagnostic records are preserved.

**Rollback point**

- Do not activate unproven DR automation; retain the existing approved operations runbook.

**Next dependency**

- Step 26 performs the Phase 5 release gate.

## Step 26 — Phase 5 controlled release gate

**Prerequisites**

- All intended milestone gates passed.
- P0 risks have exit evidence.
- Rollback rehearsals complete.

**Outputs**

- Immutable release candidate.
- Controlled canary protocol and results.
- Requirement-level verification classification.

**Required validation**

- Tests, lint, typecheck, production build, schema/compatibility checks.
- One bounded supported-path canary where applicable.
- No Phase 4 invariant regression.
- No unresolved critical `BLOCKED` or `NOT_RUN`.
- Design-limited checks have sufficient alternative evidence.

**Rollback point**

- Disable Phase 5 controls and return all operator behavior to the frozen baseline; preserve evidence.

**Next dependency**

- A separate explicit decision determines broader activation. It is not automatic and is outside this blueprint.

## Critical path

```text
1 Frozen boundary
-> 2 ADRs/ownership
-> 3 Contracts
-> 4 Evaluation harness
-> 5–9 Source Intelligence
-> 10–15 Analysis Intelligence
-> 16–19 Editorial Intelligence
-> 20–21 Operational Intelligence
-> 22–25 Reliability Evolution
-> 26 Controlled release gate
```

Operational event and reliability fixture work occurs within every earlier step, but dashboard activation and full reliability exercises wait for stable domain contracts.
