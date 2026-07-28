# Sprint 3.3 — Intelligence Ranking and Editorial Decision Layer

## Purpose and scope

Sprint 3.3 adds a deterministic, explainable ranking layer and an advisory editorial decision layer to the existing live Mission Control pipeline.

The target live flow is:

> trusted RSS collection → bounded source materialization → Vertex AI analysis → deterministic ranking → editorial recommendation → human review → approved weekly report

The architecture preserves these invariants:

- Prepared Demo remains deterministic.
- Live analysis continues to use the validated Sprint 3.2 output.
- Model-generated scores are ranking inputs, not publication authority.
- Ranking is deterministic for fixed inputs, policy version, and cutoff time.
- Every ranking result exposes its component scores and reasons.
- Human decisions are authoritative and append-only.
- No automated recommendation directly publishes content.
- Only explicitly human-approved items may enter a ready weekly report.
- Existing atomic review and publication behavior remains authoritative.

Sprint 3.3 includes live-item eligibility, normalized ranking scores, a versioned ranking policy, editorial recommendation assignment, human-review integration, weekly report assembly from approved items, and additive persistence contracts. Automatic publication, automatic authoritative rejection, model-generated report prose, live video generation, and policy learning from reviewers remain deferred.

## Existing architectural baseline

Sprint 3.2 produces `IntelligenceItem` records with source identity, publication time, relevance, impact, confidence, grounded evidence references, analysis rationales and limitations, model and prompt versions, and mandatory human review.

The current live stages are collect, deferred verify, analyze, deferred rank, deferred editorial, deferred report, and deferred video. Prepared Demo already has a deterministic compatibility sorter and report builder. Sprint 3.3 introduces a reusable versioned engine without changing Prepared Demo behavior.

The existing `StoredAnalysis`, `ReviewDecision`, `RadarItem`, and atomic `approveReviewAndPublish` path remain the sole publication authority. Sprint 3.3 integrates with that boundary rather than creating another publishing mechanism.

## Overall architecture

### Ranking eligibility gate

The eligibility gate accepts analyzed live items and checks analysis completion, source traceability and eligibility, supported analysis versions, required score validity, grounded evidence, reporting interval membership, and fixed-cutoff consistency. Unrankable items are retained with stable exclusion reasons and are never silently dropped.

### Signal extractor and normalizer

The signal extractor builds provider-neutral ranking signals from validated analysis output, source registry metadata, publication time, a fixed reporting cutoff, evidence metadata, and limitations. It performs no I/O.

The normalizer converts supported signals to `[0, 1]` and records raw value, normalized value, availability, method, weight, effective weight, and adjustments. Unknown values remain explicitly unknown and are never silently converted to zero.

### Deterministic scorer and stable ranker

A compiled, versioned policy produces a base score, deterministic adjustments, final score, rank band, explanation codes, and operator-facing ranking reasons. No model call is required.

Rank position is a deterministic view over immutable assessments. It is not part of the assessment identity because it depends on the candidate set.

### Editorial decision engine

The editorial layer maps a ranking assessment and integrity conditions to one advisory recommendation:

- Publish Immediately
- Human Review
- Monitor
- Low Priority
- Reject

“Publish Immediately” means expedited human review. It never means publication without explicit approval.

### Review queue and weekly report

The review adapter exposes ranking reasons, evidence, limitations, recommendation, priority, and blocking conditions without altering the authoritative review state.

The weekly report assembler selects only explicitly human-approved items for a fixed interval, applies deterministic diversity constraints, and produces a traceable draft. Report prose is template-based in the initial implementation.

### Dependency direction

```text
domain contracts
      ↑
pure ranking policy and scoring
      ↑
editorial recommendation policy
      ↑
ranking/editorial orchestration
      ↑
Mission Control pipeline and operator UI
      ↓
repository interfaces
      ↓
memory / local / Firestore adapters
```

Domain and scoring modules do not depend on Next.js, Firestore, Vertex AI, React, or persistence adapters. Ranking does not call the model. Editorial recommendations cannot publish or approve. Report assembly cannot mutate review decisions.

## Data flow from Live Analysis to Weekly Report

1. Sprint 3.2 produces a validated, completed live analysis. Failed and skipped analyses remain visible but do not enter scoring.
2. Orchestration resolves the source definition, fixed reporting cutoff, canonical ranking input digest, and ranking policy version.
3. Eligibility creates either an eligible result or an excluded result containing stable reason codes.
4. The engine calculates and validates a complete immutable `RankingAssessment`.
5. Eligible assessments are ordered using deterministic tie-breaking.
6. The editorial engine evaluates hard gates before score bands and stores an advisory recommendation.
7. A human approves, rejects, requests changes, monitors, lowers priority, or overrides the recommendation. Every action is attributed and append-only.
8. Report generation selects only items with a completed assessment and explicit current human approval.
9. Deterministic source and category diversity constraints are applied to report composition without changing ranking scores.
10. A traceable weekly report draft is produced and requires explicit human report approval before becoming ready.

## Ranking model

### Factors and weights

| Factor | Weight | Purpose |
|---|---:|---|
| Impact | 30% | Breadth and depth of likely consequences |
| Relevance | 25% | Fit with AI Radar’s editorial mission |
| Confidence | 20% | Reliability of the grounded analysis |
| Timeliness | 10% | Freshness relative to the fixed cutoff |
| Evidence sufficiency | 10% | Grounded support and completeness |
| Source authority | 5% | Bounded source directness signal |

The base score is:

```text
100 × (
  0.30 × impact
  + 0.25 × relevance
  + 0.20 × confidence
  + 0.10 × timeliness
  + 0.10 × evidenceSufficiency
  + 0.05 × sourceAuthority
)
```

Model scores are clamped to `[0, 100]` and divided by 100. Invalid or missing required scores make an item ineligible.

Timeliness uses fixed publication-age bands: 1.00 through 24 hours, 0.90 through two days, 0.80 through three days, 0.65 through five days, 0.50 through seven days, 0.25 through fourteen days, and 0.10 thereafter. A timestamp more than five minutes after the fixed cutoff is invalid.

Evidence sufficiency uses grounded claims, unique accepted evidence identifiers, and explicit limitations. Repeated references do not count as independent corroboration.

Source authority maps `official` to 1.00, `verified` to 0.80, `community` to 0.50, `experimental` to 0.20, and `blocked` to ineligible. Its weight is deliberately limited to 5%.

### Adjustments and bands

- Confidence below 0.40 caps the final score at 49.99.
- Confidence below 0.60 caps the final score at 69.99.
- No grounded claims with an explicit insufficiency limitation caps the score at 39.99.
- Two or more material limitations subtract five points.
- An unreliable publication timestamp subtracts five points.
- Unsupported versions, blocked sources, invalid evidence references, and incomplete analysis are ineligible.

Rank bands are critical at 85, high at 70, medium at 50, low at 30, and minimal below 30.

### Tie-breaking

Ties resolve by higher final score, confidence, evidence sufficiency, impact, newer publication time, source authority, normalized title by Unicode code point, and stable item ID. Runtime locale must not affect ordering.

### Explanations

Every assessment stores stable explanation codes and deterministic operator-facing text. The system does not call a model to explain its own score.

## Editorial decision model

Hard reject conditions are evaluated first, followed by mandatory review conditions and score-band recommendations.

### Publish Immediately

Requires a score of at least 85, confidence and impact of at least 80, relevance of at least 75, strong evidence, no material limitation, an official or verified source, recent publication, and supported analysis versions. It creates an expedited human-review item and cannot invoke publication automatically.

### Human Review

Applies to valuable items requiring judgment, including scores of at least 60 that fail an expedited gate, material limitations, moderate confidence, evidence uncertainty, or category-specific policy review.

### Monitor

Applies to developing or incomplete items with meaningful potential, generally in the 45–69 range. It records a future review time and cannot enter top stories without later approval.

### Low Priority

Applies to valid but low-value intelligence, generally in the 25–49 range. Records remain auditable and rerankable.

### Reject

Hard rejects cover integrity, provenance, version, source, and timestamp failures. Soft rejects cover extremely low score, relevance, confidence, or monitoring value. Automated reject remains a recommendation requiring human confirmation.

## Human review integration

The system keeps automated recommendation, human editorial decision, existing review status, and publication state separate.

Human overrides store the original recommendation, decision, reviewer, reason, timestamp, ranking policy version, and editorial policy version. Reranking creates a new immutable assessment and never erases an earlier human decision. A material conflict with a prior decision requires explicit human reconfirmation.

The review queue orders expedited recommendations first, then standard human review, due monitor items, low-priority items, and reject recommendations awaiting confirmation. Ranking tie-breakers apply within each bucket.

## Proposed domain contracts

The architecture defines versioned contracts for ranking factors, normalized signals, policies, inputs, eligibility, adjustments, assessments, ranked candidates, editorial recommendations, human decisions, queue projections, and weekly reports. Ranking assessments always include policy and algorithm versions, immutable input identity, cutoff time, explanations, adjustments, and supersession lineage.

The ranking domain is provider-neutral and independent of framework, model, and storage adapters. Editorial and weekly-report contracts are introduced only in later implementation slices.

## Proposed folder structure

```text
src/
  domain/
    intelligence-ranking/
      contracts.ts
      schemas.ts
      policy.ts
      eligibility.ts
      normalization.ts
      scoring.ts
      tie-breakers.ts
      explanations.ts
    editorial-decision/
      contracts.ts
      schemas.ts
      policy.ts
      recommendation.ts
      transitions.ts
    weekly-report/
      contracts.ts
      schemas.ts
      selection.ts
      assembler.ts
  services/
    live-ranking.ts
    live-editorial.ts
    weekly-report.ts
  persistence/
    intelligence-decision-repository.ts
```

Pure policy belongs in `src/domain`; orchestration belongs in `src/services`; UI consumes stored assessments and does not recalculate scores.

## Testing strategy

Unit tests cover every eligibility rule, score and date boundary, normalization band, adjustment, rank threshold, and tie-breaker. Schema tests reject unknown fields and contradictory states. Deterministic grids establish monotonicity, cap enforcement, score bounds, stable sorting, and repeatable input identity.

Integration tests use the memory repository to prove stage isolation, idempotency, immutable supersession, human approval requirements, and report traceability. Shared repository tests apply to memory, local, and Firestore adapters. Mission Control regression tests preserve Sprint 3.1 collection, Sprint 3.2 analysis, Prepared Demo, existing review routes, atomic publication integrity, and the no-model-call zero-item path.

A fixed acceptance corpus covers high-impact releases, low-confidence claims, old strategic items, evidence-poor announcements, blocked sources, future timestamps, ties, source/category concentration, and reviewer overrides.

## Migration plan from Sprint 3.2

1. Add domain contracts and validated compiled policies without changing Sprint 3.2 records.
2. Implement pure eligibility, normalization, scoring, explanations, and tie-breaking in shadow mode.
3. Add additive persistence for assessments and recommendations.
4. Persist live analysis through the existing atomic analysis-finalization boundary before enabling public review and publication.
5. Introduce the editorial queue while keeping all recommendations advisory.
6. Assemble deterministic weekly report drafts only from human-approved items.
7. Activate rank, editorial, and report stages independently after their acceptance gates. Live video remains deferred.

Prepared Demo retains its current ordering through a compatibility policy or adapter until an explicit product decision changes it.

## Risks and mitigation

| Risk | Mitigation |
|---|---|
| Poorly calibrated model scores | Treat scores as inputs, cap low-confidence results, evaluate a fixed corpus, version policy |
| Automatic interpretation of Publish Immediately | Make it expedited review and deny the recommendation layer publication access |
| Sprint 3.2 live analyses lack existing review persistence | Integrate through the authoritative atomic finalization boundary before public approval |
| Source authority dominates | Limit it to 5%, disclose the mapping, never override evidence failures |
| Recency hides enduring importance | Limit timeliness to 10% and retain a nonzero older-item value |
| Evidence count implies corroboration | Count unique accepted references only and defer cross-source corroboration |
| Ambiguous item timestamp | Use a documented compatibility rule and later add explicit publication/discovery fields |
| Policy changes overwrite history | Store immutable versioned assessments with supersession lineage |
| Reranking overwrites human judgment | Keep decisions append-only and require reconfirmation on material conflicts |
| Locale changes ordering | Use canonical Unicode code-point comparison and stable IDs |
| Diversity rules appear to change rank | Apply them only in report composition and record exclusion reasons |
| Reject recommendations hide items | Require human confirmation and retain auditable records |
| Downstream failure corrupts analysis | Persist immutable stage outputs independently and retry idempotently |
| Report prose fabricates claims | Use deterministic templates and defer model-generated narrative |

## Definition of done

Sprint 3.3 is complete when eligible live analyses receive deterministic versioned assessments; all score inputs and adjustments are explainable; fixed inputs produce fixed ordering; recommendations remain advisory; human decisions are explicit and append-only; only approved items enter ready reports; downstream failures preserve upstream results; persistence adapters pass shared contracts; Prepared Demo remains unchanged; and automatic publication and live video remain deferred.
