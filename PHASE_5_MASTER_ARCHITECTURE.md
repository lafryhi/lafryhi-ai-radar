# LAFRYHI AI Radar Phase 5 Master Architecture

## Document status

- Program: Phase 5
- Baseline: LAFRYHI AI Radar v1.0.0-rc1
- Baseline verification: `PASS_WITH_VERIFICATION_LIMITATION`
- Blueprint status: Adopted for implementation planning
- Implementation status: Offline Phase 5.1A and 5.1B implemented; complete milestone qualification pending
- Governing rule: Everything delivered in Phase 4 is frozen

## Governance status

- **Blueprint status:** Adopted for implementation planning
- **Implementation status:** Offline Phase 5.1A and 5.1B implemented; no production integration
- **Architecture decision status:** Individually reviewed for Phase 5.1. Four ADRs are Accepted, five are Accepted with documented limitations, and six are Deferred. `PHASE_5_ADR_ACCEPTANCE_RECORD.md` is authoritative.
- **Baseline:** v1.0.0-rc1
- **Blueprint adoption date:** 2026-07-27
- **Authority boundary:** This blueprint authorizes phased implementation planning only. It does not authorize production deployment, schema migration, traffic changes, publication automation, or relaxation of Phase 4 integrity controls.
- **Change-control rule:** Material architectural changes require an ADR update and explicit acceptance before implementation.

Blueprint adoption is a documentation-governance decision, not a production release or approval to begin a milestone.

The Phase 5.1 implementation entry gate is `READY_WITH_NON_BLOCKING_LIMITATIONS`. This authorizes only a future offline 5.1A implementation task followed by conditional 5.1B; no implementation has begun and no production behavior is authorized.

## Vision

Phase 5 evolves AI Radar from a safe single-item analysis and publication pipeline into an intelligence system that can understand sources, events, stories, editorial value, and operational health over time.

The system will preserve every accepted v1.0.0-rc1 safety guarantee. New intelligence will be derived, versioned, traceable, and advisory until it passes an explicit acceptance gate. It will never weaken source-grounded evidence, bypass human review, or create an alternative publication path.

## Objectives

1. Develop measurable knowledge about publisher reliability without redefining publisher trust or authorization.
2. Detect exact duplicates, near-duplicates, related coverage, and conflicting claims without silently discarding source information.
3. Extract events, entities, timelines, relationships, and cross-source comparisons with complete provenance.
4. Group analyses into evolving stories and measure novelty, confidence, and coverage.
5. Provide explainable editorial ranking, priority, breaking-news signals, digests, and long-running story tracking.
6. Make cost, latency, recovery, quality, queue, and publication behavior observable without exposing protected content.
7. Establish deterministic replay, synthetic canaries, fault injection, capacity testing, and disaster-recovery design outside the production request path.
8. Introduce each capability through shadow evaluation, bounded activation, and independently reversible releases.

## Scope

Phase 5 includes:

- Source Intelligence: reputation history, source fingerprints, canonicalization, language identification, clustering, duplicate and conflict signals.
- Analysis Intelligence: event and entity extraction, timelines, story grouping, contradiction detection, coverage, novelty, confidence, and relationship graphs.
- Editorial Intelligence: explainable story ranking, editorial priority, breaking-news assessment, summaries, digests, reports, topic evolution, and story lifecycle.
- Operational Intelligence: privacy-safe metrics and operational dashboards.
- Reliability Evolution: synthetic testing, replay simulation, fault injection, load testing, regression detection, capacity planning, and disaster-recovery preparation.
- Versioned contracts, provenance, retention, access, observability, and acceptance gates required by those capabilities.

## Non-goals

Phase 5 does not:

- change the v1.0.0-rc1 evidence acceptance contract;
- replace or weaken human review;
- introduce automatic approval or automatic publication;
- alter the existing approval/publication transaction;
- reinterpret a Phase 4 processing run or mutate its immutable inputs;
- use source reputation as an authentication or authorization mechanism;
- create a production endpoint solely to replay internal finalization;
- make fuzzy, case-insensitive, punctuation-insensitive, semantic-similarity, closest-sentence, automatic-replacement, or NFKC-based evidence acceptance valid;
- redesign authentication, IAM, secret management, or the operator trust boundary;
- rewrite historical production records in place;
- treat editorial scores as objective truth;
- make a general-availability declaration as part of architecture approval.

## Architecture principles

### 1. Frozen safety envelope

The Phase 4 provider recovery, validation, atomic readiness finalization, review, approval, and publication paths remain authoritative. Phase 5 may consume their outputs but cannot weaken their invariants.

### 2. Derived, additive intelligence

Phase 5 information is to be represented as versioned derived artifacts or read models. It must not overwrite the source snapshot, validated `AnalysisResult`, `ReviewDecision`, or published `RadarItem`. Any future persistence contract requires a separately accepted ADR and rollout plan; this blueprint creates no migration.

### 3. Provenance before inference

Every material claim, event attribute, relationship, contradiction, score contribution, and story membership must identify its supporting source record and analysis. Derived facts without provenance are not eligible for editorial activation.

### 4. Lossless ingestion and reversible suppression

Duplicate detection may suppress redundant candidates from ranking, but it must not delete source records, analyses, evidence, or relationships. Suppression is a reversible view decision with an explicit reason and canonical representative.

### 5. Deterministic identity and versioned algorithms

Identical immutable inputs and algorithm versions must produce identical identities, normalized forms, graph edges, and scores. Every derived artifact records the contract and algorithm versions used to produce it.

### 6. Exact evidence remains exact

Evidence continues to require an exact contiguous source substring after Unicode NFC normalization and deterministic whitespace normalization only. Cross-source support, reputation, embeddings, and semantic similarity cannot make an invalid quote valid.

### 7. Explainable editorial assistance

All rankings and priorities expose component signals, versions, and exclusions. They advise operators; they do not approve or publish.

### 8. Bounded and privacy-safe operation

New model and persistence work must have ceilings, timeouts, budgets, bounded telemetry, and terminal categories. Operational events must not contain source text, evidence quotes, raw model output, prompt bodies, credentials, secrets, or mismatching characters.

### 9. Shadow first

Every behavior-changing capability begins in observation-only shadow mode, is compared with a deterministic corpus, and is activated only after its milestone gate passes.

### 10. Safe test boundaries

Replay, fault injection, and destructive resilience exercises operate on recorded sanitized fixtures, synthetic data, or isolated environments. They do not require a production finalization replay endpoint.

## Reference architecture

```text
Frozen v1.0.0-rc1 write path
SourceRecord -> ProcessingRun -> validated AnalysisResult
             -> pending ReviewDecision -> explicit approval -> RadarItem
                         |
                         v
Phase 5 derived intelligence
Source Intelligence Profile
        |
        v
Extracted Event + Entity Resolution + Provenance
        |
        v
Story + Story Version + Relationship Graph
        |
        v
Editorial Assessment (advisory)
        |
        +--> Operator-facing read models
        +--> Privacy-safe operational metrics
        +--> Synthetic/replay validation corpus
```

### Logical components

| Component | Responsibility | Authoritative input | Output |
|---|---|---|---|
| Source intelligence processor | Normalize identity signals and calculate source observations | Immutable source records and publisher registry | Versioned Source Intelligence Profile |
| Analysis intelligence processor | Extract grounded event structure and relationships | Validated analysis plus source provenance | Extracted Events, resolved entities, comparisons |
| Story assembler | Group related events and track versions | Extracted Events and source fingerprints | Story and Story Version |
| Editorial engine | Calculate explainable advisory priority | Story Version and quality signals | Editorial Assessment |
| Operational metric projector | Aggregate safe counters, durations, costs, and states | Bounded domain events | Operational Metric read models |
| Reliability harness | Execute deterministic scenarios outside the production path | Sanitized fixtures and synthetic faults | Validation reports and regression baselines |

Components are logical boundaries, not a mandate for separate services. Initial implementation should prefer modules and asynchronous workers within the current deployment model until measurements justify additional operational complexity.

## Shared terminology

| Term | Definition |
|---|---|
| Publisher | An organization or site registered as a source producer. |
| Publisher trust | Existing operator-controlled eligibility/configuration; Phase 5 does not replace it. |
| SourceRecord | The immutable normalized article snapshot already processed by the pipeline. |
| Source Intelligence Profile | Versioned observations about a publisher/source, calculated from history. |
| Extracted Event | A grounded, versioned representation of something asserted to have happened. |
| Entity | A typed real-world subject with source-specific mentions and a resolved identity confidence. |
| Story | A stable grouping identity for related events and coverage. |
| Story Version | An immutable snapshot of story membership and derived state at a point in logical time. |
| Contradiction | Two provenance-linked claims that cannot both be true under the same scope and time. |
| Editorial Assessment | A versioned, explainable set of advisory scores for a Story Version. |
| Suppression | Reversible removal from a ranked view, never deletion of underlying information. |
| Operational Metric | A bounded aggregate or event that contains no protected content. |
| Synthetic Scenario | Non-production or isolated test input with known expected outcomes. |

## Compatibility rules with v1.0.0-rc1

| Frozen baseline contract | Phase 5 compatibility rule |
|---|---|
| Prompt version `radar-decision-intelligence-v3` | Remains the Phase 4 analysis prompt. Any new model task uses a distinct prompt name/version. |
| Exact evidence grounding | Remains authoritative and is rechecked before Phase 5 evidence is eligible for use. |
| Gemini ceiling: 1 initial, 2 transient retries, 1 regeneration, 4 total calls | Remains unchanged for the Phase 4 processing run. Phase 5 tasks require separate explicit budgets and cannot consume or reset that ceiling. |
| Deterministic IDs for analysis, review, and publication | Remain unchanged. Phase 5 identities use separate namespaces and never collide. |
| Atomic analysis readiness | Remains the only supported transition to pending review. |
| Explicit human approval | Remains mandatory. Editorial priority cannot transition review state. |
| Atomic publication | Remains the only publication write path. |
| Existing feature flags and flag-off behavior | Remain unchanged. Phase 5 introduces only milestone-specific controls after ADR acceptance. |
| No production finalization replay endpoint | Remains intentional and is not worked around. |
| Privacy-safe recovery telemetry | Applies to all Phase 5 telemetry and is extended with field allowlists. |
| Existing records and collections | Are not rewritten by Phase 5. New storage is additive and requires design approval before implementation. |

## Data and contract strategy

### Derived artifact envelope

Every proposed Phase 5 artifact should carry:

- deterministic artifact ID;
- source identifiers, never copied source text;
- immutable input-version references;
- algorithm name and version;
- schema version;
- created-at server timestamp and logical effective time;
- provenance references;
- lifecycle state;
- confidence or quality components where relevant;
- supersedes reference where a newer immutable version exists.

The exact schema and collection layout are deferred to accepted ADRs. This document does not authorize a database change.

### Processing model

1. A frozen Phase 4 record becomes eligible only after validation completes.
2. Phase 5 processors consume immutable identifiers and snapshots.
3. Derived computation is idempotent for the same input set and algorithm version.
4. New versions are appended; previously published facts are not rewritten.
5. Failed derivation cannot alter review or publication state.
6. Operators can inspect why a story was grouped, suppressed, ranked, or flagged.

## Release strategy

Each milestone follows the same release ladder:

1. **Contract gate** — approve ADRs, schemas, identities, privacy classification, budgets, and rollback semantics.
2. **Offline gate** — run deterministic fixtures and historical sanitized corpora without production writes.
3. **Shadow gate** — calculate outputs in production without affecting operator ordering, review, or publication.
4. **Advisory gate** — expose read-only explanations to designated operators behind a milestone control.
5. **Controlled activation** — enable one bounded behavior, source cohort, or operator cohort.
6. **General activation decision** — require explicit gate approval; never inferred from elapsed time.

Releases are independently versioned. A later milestone cannot require partially activated outputs from an earlier milestone; it may require only an accepted contract and validated artifact version.

## Rollback strategy

- Disable the affected Phase 5 processor or read model independently.
- Stop producing new derived versions while retaining existing artifacts for diagnosis.
- Restore operator views to frozen v1.0.0-rc1 ordering and behavior.
- Never delete source records, analyses, reviews, publications, partial diagnostics, or failed derived artifacts during rollback.
- Treat derived artifacts from a withdrawn algorithm version as inactive, not erased.
- Keep schema readers tolerant of known prior versions.
- Preserve the Phase 4 canary fallback and existing flags until a separate release decision changes them.
- If a Phase 5 failure affects the frozen write path, immediately isolate Phase 5 consumption and apply the established production rollback procedure.

## Risk analysis

| Risk | Architectural response |
|---|---|
| Reputation scores become a proxy for authorization or bias | Keep reputation advisory, explain components, require minimum samples, expose uncertainty, and retain operator-controlled trust. |
| Near-duplicate grouping merges distinct events | Use conservative thresholds, provenance, reversible membership, conflict detection, and shadow evaluation. |
| Cross-source agreement amplifies copied misinformation | Model publisher clusters and shared-origin likelihood; count independence, not raw article count. |
| Entity resolution joins different people or organizations | Retain mentions, confidence, competing candidates, and human correction; do not destructively merge. |
| Editorial scoring hides subjective policy | Version weights, show components, define policy ownership, and keep human decisions authoritative. |
| Breaking-news logic produces urgency inflation | Require freshness, novelty, corroboration or explicit single-source uncertainty, and decay. |
| New model tasks increase cost and latency | Budget per task, cache deterministic results, batch where safe, and expose cost projections before activation. |
| Metrics leak protected text or create high-cardinality telemetry | Use allowlists, bounded categorical fields, identifier rules, cardinality tests, and redaction audits. |
| Replay or fault injection touches production | Isolate environments, use synthetic/sanitized fixtures, deny production credentials, and prohibit production replay endpoints. |
| Derived schema proliferation becomes unmanageable | Adopt artifact envelopes, ownership, retention, schema versions, and ADR-gated persistence. |
| Phase 5 failure blocks Phase 4 | Use asynchronous consumers, separate failure domains, bounded queues, and circuit breakers. |

The detailed ownership and exits are maintained in `PHASE_5_RISK_REGISTER.md`.

## Success metrics

Metrics are evaluated against versioned, labeled corpora and production shadow observations.

### Safety

- Zero Phase 5-triggered approvals or publications.
- Zero weakening of exact evidence validation.
- Zero orphaned or mutated frozen Phase 4 records.
- Zero protected-content telemetry incidents.
- 100% of active derived artifacts contain algorithm, schema, and provenance versions.

### Source intelligence

- Exact duplicate precision: target at least 99.9%.
- Near-duplicate precision: target at least 98% before advisory activation.
- Language detection macro F1: target at least 0.97 for supported languages.
- Canonical URL false-merge rate: target below 0.1%.
- Reputation calibration and minimum-sample behavior reviewed per publisher cohort.

### Analysis intelligence

- Event extraction precision and recall measured per event type.
- Entity resolution false-merge rate below the accepted corpus threshold.
- Contradiction precision target at least 95%; unresolved cases remain advisory.
- Story grouping precision target at least 97%; membership changes are reversible.
- Confidence calibration measured with Brier score and reliability diagrams.

### Editorial intelligence

- Ranking agreement and disagreement with labeled editorial judgments are measured, not assumed.
- Every visible score has complete component explanations.
- Duplicate-story impressions are reduced without losing unique source coverage.
- Digest factual error and unsupported-claim rate remain zero in the acceptance corpus.

### Operations and reliability

- Metric freshness and completeness meet accepted service-level objectives.
- Recovery, latency, and cost aggregates reconcile with sampled run records.
- Synthetic canaries detect seeded critical failures within the accepted interval.
- Replay results are deterministic for fixed fixtures and versions.
- Capacity tests demonstrate defined headroom before activation.

Targets are proposals until their owning milestone approves a labeled corpus, sampling plan, and statistical confidence.

## Acceptance gates

### Gate P5-0 — Program contract

- All Phase 5 ADRs needed for the first implementation slice are accepted.
- Data classification, provenance, identity, retention, and ownership are defined.
- Frozen Phase 4 invariants have automated regression coverage.

### Gate P5-1 — Source Intelligence

- Exact and near-duplicate behavior meets labeled-corpus thresholds.
- Conflicts are visible before any view suppression.
- Reputation is advisory and sample-size aware.
- Canonicalization has no known destructive merge path.

### Gate P5-2 — Analysis Intelligence

- Events, entities, contradictions, and story memberships retain provenance.
- Confidence and coverage are separately defined and calibrated.
- Invalid evidence cannot become valid through cross-source reasoning.
- Multi-model contracts preserve deterministic validation.

### Gate P5-3 — Editorial Intelligence

- Every score and ranking is explainable and versioned.
- No scoring output can approve or publish.
- Digest and report statements trace to accepted evidence.
- Story lifecycle transitions are deterministic and reversible where appropriate.

### Gate P5-4 — Operational Intelligence

- Telemetry allowlist and privacy audit pass.
- Dashboards reconcile to bounded source records.
- Cost estimates disclose their accounting limitations.
- Alerts have documented thresholds, ownership, and runbooks.

### Gate P5-5 — Reliability Evolution

- Synthetic, replay, chaos, and load tools are isolated from production writes.
- Deterministic replay and regression baselines pass repeatedly.
- Disaster-recovery objectives and evidence-preservation procedures are approved.
- Capacity and failure-mode exercises show no bypass of the frozen safety envelope.

### Release gate

A Phase 5 release may proceed only when:

- its milestone gate is `PASS`;
- all critical executable checks pass;
- no safety invariant is `FAIL`;
- any `NOT_EXECUTABLE_BY_DESIGN` item has the required structural and downstream evidence;
- no critical supported test is `NOT_RUN`;
- no unresolved critical `BLOCKED` result remains;
- rollback is rehearsed at the appropriate environment boundary.

The v1.0.0-rc1 verification taxonomy remains authoritative.

## Implementation phases

### Phase 5.0 — Contracts and evaluation foundation

Approve identities, artifact envelopes, provenance, privacy, labeled corpora, ownership, and shadow controls. This is the prerequisite for all implementation.

### Phase 5.1 — Source Intelligence

Build deterministic source identities, normalization, fingerprints, language signals, duplicate/conflict evaluation, and advisory reputation history.

### Phase 5.2 — Analysis Intelligence

Build provenance-linked events, entities, claims, comparisons, contradictions, story grouping, novelty, coverage, confidence, and relationship graph projections.

### Phase 5.3 — Editorial Intelligence

Build explainable rankings, priority, breaking-news assessment, lifecycle, summaries, digests, and reports as advisory outputs.

### Phase 5.4 — Operational Intelligence

Build bounded telemetry projections, reconciliation, dashboards, alerts, and operator-action audit views. Its event contract begins in Phase 5.0; user-facing views follow stable domain signals.

### Phase 5.5 — Reliability Evolution

Build isolated replay, synthetic canaries, fault injection, load and longevity tests, regression detection, capacity models, and future disaster-recovery exercises. Reliability fixtures begin early, but activation follows the contracts they test.

The risk-minimized sequence and rollback points are specified in `PHASE_5_IMPLEMENTATION_ORDER.md`.

## Open architectural questions

1. Which languages and regions form the first supported evaluation cohort?
2. Who owns publisher-reputation policy and adjudicates contested observations?
3. What labeled corpora and editorial judgments may be retained, and for how long?
4. What is the acceptable false-merge rate for entity and story identity by risk class?
5. Which Phase 5 outputs may eventually influence queue ordering, and which remain display-only?
6. What cost and latency budgets apply to each new model task?
7. Is an embedding provider acceptable, and what locality, retention, and versioning constraints apply?
8. What independent-source model should identify syndication, ownership, and common origin?
9. What recovery point and recovery time objectives are appropriate for derived artifacts?
10. Which operators may correct story membership or entity resolution, and how are corrections audited?
