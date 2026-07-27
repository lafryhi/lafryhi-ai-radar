# Phase 5 Proposed Architecture Decisions

## Governance

These ADRs govern decisions required for Phase 5. Each entry is reviewed individually; acceptance is limited to its stated scope and never authorizes deployment or production behavior. The authoritative review rationale and implementation impact are recorded in `PHASE_5_ADR_ACCEPTANCE_RECORD.md`.

An ADR becomes accepted only through the Phase 5 governance process. Acceptance must record the decision date, owners, validation evidence, compatibility assessment, and superseded decisions.

## P5-ADR-001 — Additive versioned derived artifacts

**Status:** Accepted

**Prerequisite classification:** FOUNDATIONAL_BLOCKING

### Context

Phase 5 needs source profiles, events, entities, Stories, Editorial Assessments, and operational projections. Rewriting validated Phase 4 records would blur authority, make rollback unsafe, and complicate historical interpretation.

### Decision

Represent Phase 5 intelligence as immutable, versioned derived artifacts referencing authoritative v1.0.0-rc1 records. New calculations append versions and mark supersession; they do not mutate source, analysis, review, or publication records.

### Consequences

- Rollback can deactivate an algorithm version without restoring baseline data.
- Storage and query complexity increase.
- Readers need explicit current-version resolution.
- Historical comparisons remain reproducible.

### Alternatives

1. Add Phase 5 fields directly to existing records—simpler reads but high compatibility and rollback risk.
2. Rewrite records in place—low storage growth but destroys reproducibility.
3. Keep all intelligence transient—avoids storage but prevents audit, reconciliation, and stable editorial decisions.

## P5-ADR-002 — Deterministic identities and immutable Story Versions

**Status:** Accepted with documented limitations

**Prerequisite classification:** MILESTONE_5_1_BLOCKING

**Accepted limitation:** Phase 5.1 acceptance covers deterministic source-fingerprint and artifact-envelope identities only. Story, Story Version, Entity, graph-edge, split, and merge identity encodings remain unauthorized until their milestone review.

### Context

Retries, asynchronous delivery, story evolution, splits, and merges require idempotency without ambiguous identity reuse.

### Decision

Derive artifact identities from canonical ordered input IDs plus algorithm/schema version. Keep a stable Story identity while recording membership and state in immutable Story Versions. Splits and merges create lineage rather than rewriting history.

### Consequences

- Repeated computation is idempotent.
- Canonical serialization and collision-resistant hashing must be standardized.
- Corrections create new versions and may require current-version indexes.

### Alternatives

1. Random IDs—easy creation but weak retry deduplication.
2. Mutable Story documents—simple queries but poor audit and concurrency semantics.
3. Content-only IDs—unstable across normalization changes and prone to cross-version confusion.

## P5-ADR-003 — Provenance-linked claim and event graph

**Status:** Accepted with documented limitations

**Prerequisite classification:** FOUNDATIONAL_BLOCKING

**Accepted limitation:** Phase 5.1 may define provenance structures and validate their completeness offline. It may not create a production relationship graph, graph persistence layer, or graph traversal service.

### Context

Cross-source comparison, contradictions, timelines, and generated summaries require a shared representation that explains how derived information relates to accepted evidence.

### Decision

Use typed Claims, Extracted Events, Entities, Stories, and provenance-bearing Relationship Edges as the common semantic layer. Every material assertion and graph edge references accepted supporting artifacts and its derivation version.

### Consequences

- Explanations and audits become possible.
- Graph and schema governance become significant.
- Queries require bounded traversal and index design.
- Incorrect resolution can propagate, so versions and confidence are mandatory.

### Alternatives

1. Free-form summaries only—low structure but poor comparison and validation.
2. Pairwise ad hoc tables—simpler initially but duplicates semantics and prevents coherent provenance.
3. External knowledge graph as authority—powerful but introduces boundary, availability, and truth-governance risk.

## P5-ADR-004 — Source reputation is advisory and decomposed

**Status:** Accepted

**Prerequisite classification:** NON_BLOCKING_FOR_5_1

**Implementation note:** Acceptance fixes the governance boundary between operator-controlled publisher trust and analytically derived source reputation. Phase 5.1 does not implement or change reputation.

### Context

Historical source behavior is useful, but a single opaque trust score can encode bias, confuse platform/model failures with publisher failures, and become an unintended authorization boundary.

### Decision

Maintain sample-aware reputation components, uncertainty, time windows, and measurement versions. Any composite is an explainable operator-view policy. Computed reputation cannot automatically change publisher trust configuration.

### Consequences

- Operators see nuance and sparse-data uncertainty.
- Policy and measurement ownership are required.
- Automated source suspension is explicitly unavailable.

### Alternatives

1. One global trust score—simple but opaque and unsafe.
2. No reputation measurement—avoids bias but loses useful quality history.
3. Automatic trust changes—operationally convenient but incompatible with the trusted operator boundary.

## P5-ADR-005 — Conservative duplicate and canonicalization model

**Status:** Accepted with documented limitations

**Prerequisite classification:** MILESTONE_5_1_BLOCKING

**Accepted limitation:** Phase 5.1 covers conservative canonical URL normalization, deterministic source fingerprinting, exact-identity fixtures, and conflict-preserving contracts offline. Near-duplicate classification, clustering, view suppression, and production behavior remain outside the authorized scope.

### Context

Duplicate suppression improves queues, but false merging can erase distinct reporting, conflicts, or updates.

### Decision

Separate exact duplicate identity, near-duplicate classification, related-story grouping, and view suppression. Conflicts are validated before suppression. URL canonicalization is publisher-aware and allowlist-based. Under uncertainty, retain separate records.

### Consequences

- Information loss is prevented.
- Some duplicates remain visible until classifiers mature.
- Multiple fingerprints and labeled evaluation are needed.

### Alternatives

1. Normalize aggressively and merge—higher apparent recall but destructive false positives.
2. Embedding threshold alone—convenient but nondeterministic, opaque, and unsuitable for identity.
3. No deduplication—safe retention but degraded editorial utility and cost.

## P5-ADR-006 — NFC-only exact evidence boundary remains authoritative

**Status:** Accepted

**Prerequisite classification:** FOUNDATIONAL_BLOCKING

### Context

Phase 5 will use semantic comparison and possibly embeddings, which must not be confused with evidence acceptance.

### Decision

Retain exact contiguous matching after Unicode NFC and deterministic whitespace normalization only. Semantic, fuzzy, case-insensitive, punctuation-insensitive, closest-sentence, automatic-replacement, and NFKC-based acceptance remain prohibited across all Phase 5 tasks.

### Consequences

- Grounding remains strict and predictable.
- Models may still fail on typographic differences and must fail safely.
- Cross-source validation can support Claims but cannot rehabilitate invalid quotes.

### Alternatives

1. Fuzzy/semantic evidence acceptance—improves apparent pass rate but can accept hallucinated wording.
2. NFKC normalization—handles compatibility forms but can change meaning.
3. Automatic source excerpt substitution—could conceal model failure and change intended evidence.

## P5-ADR-007 — Provider-neutral model task envelope

**Status:** Deferred

**Prerequisite classification:** DEFERRED

**Reason:** Phase 5.1 permits no model calls. Provider-neutral model execution is reviewed before a later model-assisted milestone.

### Context

Future event extraction or editorial synthesis may use different models, but provider-specific behavior must not bypass validation or make recovery nondeterministic.

### Decision

Define a provider-neutral, versioned task envelope with immutable inputs, model/prompt/schema versions, deterministic settings, explicit budgets, typed failures, and a common validation boundary. Provider adapters translate transport behavior only.

### Consequences

- Providers can be evaluated consistently.
- Lowest-common-denominator contracts may limit provider-specific features.
- Each provider/model version still needs calibration.

### Alternatives

1. Provider-specific pipelines—faster experiments but duplicated logic and inconsistent safety.
2. Automatic provider race—lower latency but nondeterministic cost and selection.
3. Merge outputs from multiple providers—may improve recall but violates complete-object validation unless separately designed.

## P5-ADR-008 — Confidence and coverage are separate calibrated outputs

**Status:** Deferred

**Prerequisite classification:** DEFERRED

**Reason:** Confidence and coverage are not produced by the deterministic offline Phase 5.1 scope.

### Context

A well-extracted narrow account can be high confidence but low coverage. Combining the concepts produces misleading editorial decisions.

### Decision

Calculate confidence and coverage independently, expose components and unknown states, and calibrate confidence against labeled outcomes. Do not derive either solely from model self-reported confidence.

### Consequences

- Editorial policies can distinguish research need from extraction risk.
- Two evaluation programs and more labels are required.
- Existing UI concepts may need careful terminology later.

### Alternatives

1. One quality score—simple but conflates distinct risks.
2. Model self-confidence—cheap but poorly calibrated.
3. Source count as coverage—miscounts syndication and misses viewpoint gaps.

## P5-ADR-009 — Explainable, human-advisory editorial scoring

**Status:** Deferred

**Prerequisite classification:** DEFERRED

**Reason:** Editorial scoring is outside Source Intelligence foundation work.

### Context

Ranking and breaking-news logic encode editorial policy and can create feedback loops or hidden bias.

### Decision

Use versioned component signals and policy weights, expose all contributions and exclusions, and keep output advisory. No score, lifecycle state, or generated product may approve or publish.

### Consequences

- Policy changes are auditable and reversible.
- Editors must own weights and acceptance labels.
- Rankings may be less adaptive than opaque learned models.

### Alternatives

1. End-to-end learned ranking—potential quality but weak explainability/governance.
2. Model-chosen weights—flexible but nondeterministic policy.
3. Fully manual ordering—safe but does not meet the intelligence objective.

## P5-ADR-010 — Append-only bounded operational events

**Status:** Accepted with documented limitations

**Prerequisite classification:** FOUNDATIONAL_BLOCKING

**Accepted limitation:** Acceptance covers the field allowlist, denylist, retention classes, and offline evaluation telemetry contract. It does not authorize a production event emitter, metric store, dashboard, alert, or new production logging field.

### Context

Dashboards need reliable inputs, while logs must not become an unbounded or sensitive data store.

### Decision

Emit versioned, allowlisted, bounded operational events and build idempotent aggregates. Reconcile critical metrics to authoritative repository state. Keep dashboards off the synchronous pipeline.

### Consequences

- Metrics are rebuildable and privacy-auditable.
- Event retention, cardinality, and projector operations require governance.
- Some detail is intentionally unavailable for incident reconstruction.

### Alternatives

1. Parse application logs—low initial effort but unstable and privacy-prone.
2. Query domain stores for every dashboard—accurate but expensive and coupled.
3. Include raw content for debugging—high diagnostic value but unacceptable privacy exposure.

## P5-ADR-011 — View-only duplicate suppression

**Status:** Deferred

**Prerequisite classification:** NON_BLOCKING_FOR_5_1

**Reason:** Phase 5.1 performs no production suppression or ranking. The lossless and reversible boundary remains mandatory.

### Context

Queues and digests should avoid repeated Stories, but deletion or mutation would hide coverage and conflicts.

### Decision

Represent suppression as a reversible, versioned relation from a candidate to its visible canonical Story, with reasons and conflict checks. Retain every source, analysis, event, and Story Version.

### Consequences

- Operators can inspect all coverage and reverse mistakes.
- Queries must apply a suppression projection.
- Storage is not reduced by suppression.

### Alternatives

1. Delete duplicates—efficient but violates lossless handling.
2. Overwrite membership—obscures history.
3. Show everything—preserves information but harms queue usability.

## P5-ADR-012 — Isolated replay and fault-injection boundary

**Status:** Accepted with documented limitations

**Prerequisite classification:** FOUNDATIONAL_BLOCKING

**Accepted limitation:** Phase 5.1 may build an offline deterministic corpus harness using synthetic or approved sanitized fixtures. Production replay, fault injection, credentials, endpoints, data, and writes remain prohibited.

### Context

Reliability testing needs controllable provider, persistence, clock, and queue failures. Exposing internal operations or fault controls in production creates material attack surface.

### Decision

Run replay and injection only with synthetic/sanitized fixtures in isolated environments. Enforce isolation through credentials, network policy, environment identity, and production-build/runtime guards. Do not add a production finalization replay endpoint.

### Consequences

- Direct production invocation of some internal operations remains `NOT_EXECUTABLE_BY_DESIGN`.
- Structural, unit, integration, simulator, and downstream invariant evidence remain necessary.
- Environment parity must be measured explicitly.

### Alternatives

1. Hidden production admin endpoints—easy verification but unnecessary attack surface.
2. Direct production database manipulation—unrepresentative and unsafe.
3. No fault injection—reduces risk but leaves failure behavior unverified.

## P5-ADR-013 — Logical clocks and deterministic cutoffs

**Status:** Accepted

**Prerequisite classification:** FOUNDATIONAL_BLOCKING

### Context

Novelty, breaking-news expiry, lifecycle, reports, and replay depend on time. Wall-clock reads make results irreproducible.

### Decision

Pass a logical evaluation cutoff through time-dependent Phase 5 computations. Persist it with derived artifacts. Use stable ID tie-breaking and explicit time precision.

### Consequences

- Replay and report regeneration are deterministic.
- APIs and jobs must carry clock context.
- Operational timestamps remain separate from semantic cutoffs.

### Alternatives

1. Read system time inside components—simple but nondeterministic.
2. Store only creation time—cannot reproduce historical decisions.
3. Infer cutoff from newest source—fails with late arrivals.

## P5-ADR-014 — Embeddings are candidate-generation features only

**Status:** Deferred

**Prerequisite classification:** DEFERRED

**Reason:** Embeddings and model-assisted candidate generation are excluded from Phase 5.1.

### Context

Embeddings could improve near-duplicate and Story candidate recall but are model/version dependent and semantically approximate.

### Decision

If approved, embeddings generate or score candidates only. Deterministic rules and validated provenance make final identity, conflict, and suppression decisions. Embeddings cannot validate evidence.

### Consequences

- Recall may improve without making embeddings authoritative.
- Storage, provider boundary, drift, and re-embedding costs remain.
- A non-embedding fallback path is required.

### Alternatives

1. Embedding-only merge—high false-merge and reproducibility risk.
2. Prohibit embeddings—simpler but may reduce multilingual recall.
3. Use lexical methods only—deterministic but weaker on paraphrase.

## P5-ADR-015 — Rebuildable derived state and tiered disaster recovery

**Status:** Deferred

**Prerequisite classification:** DEFERRED

**Reason:** Disaster-recovery implementation is outside the offline foundation and requires later RTO/RPO decisions.

### Context

Authoritative review/publication records and derived Phase 5 intelligence have different recovery needs.

### Decision

Classify data into authoritative, protected source, derived rebuildable, configuration/secret, and operational aggregate tiers. Restore the frozen pipeline first; rebuild derived artifacts from immutable references when safe. Define RTO/RPO per tier.

### Consequences

- Backup cost can align with data criticality.
- Rebuild time and version availability must be planned.
- Retired algorithm/model dependencies may limit exact rebuilds.

### Alternatives

1. Back up everything identically—simple but expensive and may not preserve reproducibility dependencies.
2. Rebuild everything—invalid for reviews/publications and potentially source retention.
3. Restore derived data before authoritative state—risks inconsistent views.

## Decision dependencies

| ADR | Must precede |
|---|---|
| P5-ADR-001, 002, 003, 006, 010, 012, 013 | Any Phase 5 implementation |
| P5-ADR-004, 005, 014 | Source Intelligence activation |
| P5-ADR-007, 008 | Analysis Intelligence model tasks |
| P5-ADR-009, 011 | Editorial Intelligence activation |
| P5-ADR-015 | Disaster-recovery implementation |
