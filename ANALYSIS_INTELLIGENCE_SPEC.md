# Phase 5 Analysis Intelligence Specification

## Status

Proposed architecture only. Phase 4 validated analyses, evidence rules, recovery ceilings, review, and publication remain frozen and authoritative.

## Purpose

Analysis Intelligence converts validated article-level output into provenance-linked events, entities, claims, timelines, comparisons, stories, novelty, coverage, confidence, and relationships. It creates new derived artifacts; it does not rewrite the validated `AnalysisResult`.

## Core invariants

- Model output is untrusted until deterministic validation succeeds.
- Every material derived assertion links to accepted source evidence.
- Exact evidence is checked under the v1.0.0-rc1 contract only.
- Partial model objects are never merged into accepted artifacts.
- Confidence does not mean truth, and coverage does not mean confidence.
- Cross-source popularity is not independent corroboration.
- Conflicts and minority reports are preserved.
- A failed Phase 5 analysis cannot affect review or publication state.

## Conceptual artifacts

| Artifact | Purpose |
|---|---|
| Claim | A scoped subject–predicate–object/value assertion with time, qualifiers, and provenance |
| Extracted Event | A typed occurrence composed of grounded claims, participants, place, and time |
| Entity Mention | A source-specific span/reference to a possible Entity |
| Entity | A stable resolution hypothesis linking compatible mentions |
| Comparison | A structured relation between compatible claims |
| Contradiction | A comparison stating that compatible claims cannot both hold |
| Story | Stable identity for related event evolution |
| Story Version | Immutable membership and derived state at a logical cutoff |
| Relationship Edge | Typed, directed, provenance-linked relation between artifacts |
| Analysis Intelligence Assessment | Versioned confidence, coverage, novelty, and integrity summary |

## Event extraction

### Event contract

An Extracted Event contains:

- event type from a versioned taxonomy;
- grounded title/label for display;
- participant Entity references and roles;
- location references with granularity;
- temporal interval and precision;
- status such as reported, ongoing, completed, planned, canceled, or disputed;
- source-scoped Claims;
- evidence references into the validated analysis/source;
- extraction model, prompt, schema, and validator versions;
- field-level confidence and missing/unknown states.

### Extraction behavior

1. Select only a validated `AnalysisResult`.
2. Provide immutable source and analysis references to a separately versioned task.
3. Request a complete structured object.
4. Parse, validate schema, validate evidence, and validate duplicate integrity separately.
5. Reject unsupported fields rather than invent defaults.
6. Store accepted output as a new immutable version.

Event extraction never reparses partial Phase 4 output or uses cross-source text to repair evidence.

## Entity extraction and resolution

### Mention extraction

Mentions retain:

- source record and analysis references;
- exact or validated evidence reference;
- surface form;
- proposed type;
- contextual roles;
- detector version.

### Resolution

Resolution considers normalized name, aliases, type, location, roles, identifiers, temporal compatibility, and graph context. It produces:

- selected Entity candidate, if above an accepted threshold;
- confidence and component reasons;
- alternative candidates;
- unresolved or ambiguous status;
- conflict indicators.

Rules:

- Complete compatible records may share an Entity.
- Matching type and normalized name alone is insufficient.
- Conflicting meaningful fields prevent automatic merge.
- Human corrections are append-only decisions with actor and reason.
- Splits and merges create new resolution versions; mentions are never lost.
- Locale-independent deterministic comparisons are mandatory.

## Timeline generation

A timeline is a view over Events and Claims, not a free-form model narrative. It represents:

- exact timestamps;
- date-only or approximate intervals;
- relative time anchored to a source observation;
- unknown start/end;
- reported-at versus occurred-at;
- update/correction relationships;
- simultaneous or unordered events.

Ordering rules:

1. Use normalized UTC instants only when the source supplies sufficient timezone information.
2. Preserve original precision and timezone uncertainty.
3. Do not invent a time to create an order.
4. Apply deterministic tie-breaking by stable artifact ID.
5. Mark inconsistent temporal constraints as conflicts.

Generated timeline prose, if later offered, is derived from the structured timeline and carries evidence links.

## Cross-source comparison

Claims are comparable only when subject identity, predicate, unit, scope, and applicable time are compatible. The comparison pipeline:

1. creates candidate pairs using deterministic indexes;
2. checks entity and temporal compatibility;
3. normalizes explicitly convertible units;
4. accounts for common origin and syndication;
5. classifies support, refinement, update, contradiction, or incomparable;
6. retains both Claims and an explanation.

Missing coverage is not disagreement. Later corrected information is not necessarily a contradiction with an earlier, time-bounded report.

## Contradiction detection

### Types

- mutually exclusive categorical values;
- non-overlapping numeric ranges after safe unit conversion;
- incompatible event status;
- incompatible participant/role;
- incompatible location at the same required granularity;
- temporal impossibility;
- explicit denial;
- correction or retraction of an earlier claim.

### Guardrails

- Compare only under the same scope and time.
- Separate direct contradiction from unresolved discrepancy.
- Require provenance for both sides.
- Report independence likelihood.
- Do not infer which side is true from publisher reputation alone.
- Maintain a high-precision threshold before operator display.
- Operator adjudication is separate from automated classification.

## Confidence estimation

Confidence estimates how likely a derived artifact is correctly extracted or resolved given available evidence. Proposed component signals:

- schema and integrity validation;
- directness and number of grounded evidence references;
- extraction ambiguity;
- entity-resolution confidence;
- temporal precision;
- independent corroboration;
- source observation quality;
- contradiction state;
- model agreement, if multiple models are later used.

Aggregation must be calibrated against labeled outcomes, versioned, and decomposable. Publisher reputation is a bounded component, never a veto or truth oracle. Scores with insufficient calibration are labeled experimental.

Calibration reports include Brier score, reliability diagrams, expected calibration error, cohort sample sizes, and drift.

## Coverage estimation

Coverage measures how much of the expected information for an event/story is represented. It is separate from confidence.

Signals include:

- expected event-type fields present;
- participant-role completeness;
- time and place specificity;
- number and diversity of plausibly independent sources;
- perspective/category diversity defined by editorial policy;
- unresolved questions;
- contradiction resolution state;
- elapsed time relative to story lifecycle.

Coverage does not reward repeated syndicated copies. An event can have high-confidence extraction and low coverage, or broad coverage with unresolved low-confidence claims.

## Story grouping

### Story identity

A Story is a stable container; membership evolves through immutable Story Versions. Candidate grouping uses:

- compatible event types;
- resolved entity overlap;
- time and location proximity;
- claim overlap;
- source and content fingerprints;
- explicit update/correction links;
- lexical or embedding similarity as non-authoritative features.

### Membership decisions

Each membership has:

- Story and Event references;
- classifier/version;
- component scores and threshold;
- inclusion reason;
- competing Story candidates;
- operator override, if any;
- effective Story Version.

Uncertain events remain ungrouped or proposed. False merges are considered more harmful than temporary fragmentation.

### Split and merge

Story merges and splits create new Story Versions and lineage edges. They do not rewrite event history or reuse identity ambiguously.

## Novelty scoring

Novelty estimates new grounded information contributed by an event or analysis relative to a fixed prior-coverage snapshot. Components:

- new Claims;
- changed Claim values;
- new entities or roles;
- increased temporal/location precision;
- correction or retraction;
- new independent source origin;
- new contradiction;
- lifecycle transition.

Non-novel signals include copied wording, repeated syndicated coverage, and already-known claims.

The prior snapshot ID, cutoff, component contributions, and algorithm version are required. Novelty is bounded, deterministic for fixed inputs, and recomputed only as a new version.

## Duplicate story suppression

Suppression controls ranked presentation only. It may occur when a candidate contributes no material novelty and maps confidently to an existing Story Version.

Rules:

- validate conflicts before suppression;
- retain all source, analysis, event, and membership records;
- preserve source diversity and a coverage list;
- expose canonical Story, reason, and algorithm version;
- allow operator reversal;
- never suppress an update, correction, contradiction, or materially novel detail;
- never affect review or publication records.

## Relationship graph

### Node types

- Publisher
- SourceRecord
- AnalysisResult
- Claim
- Extracted Event
- Entity
- Story
- Story Version
- Editorial Assessment
- RadarItem

### Edge types

- published_by
- derived_from
- supported_by
- mentions
- participates_in
- member_of
- updates
- corrects
- contradicts
- corroborates
- near_duplicate_of
- supersedes
- published_as

Edges contain direction, provenance, effective time, confidence, algorithm version, and lifecycle. A graph edge is a derived assertion, not authorization.

Graph traversal has bounded depth and result size. Sensitive text is not embedded in graph telemetry.

## Future multi-model compatibility

### Provider-neutral task envelope

Each new model task should declare:

- task name and task version;
- immutable input references and canonical serialized input digest;
- model/provider identifier;
- prompt version;
- schema version;
- temperature and deterministic controls;
- token/call/time budget;
- validation policy;
- recovery policy;
- output provenance.

### Common validation boundary

All providers must pass the same parser, schema, evidence, duplicate-integrity, and domain validators. Provider confidence fields are untrusted inputs. A provider-specific adapter may translate transport errors but cannot change acceptance rules.

### Comparison and fallback

Multi-model operation may support offline evaluation, shadow comparison, or a separately approved fallback. It must not:

- merge partial outputs;
- choose an invalid response because models agree;
- exceed a task's explicit call budget;
- introduce nondeterministic provider selection;
- send protected content to an unapproved boundary.

## Determinism

- Fix input snapshots and cutoff time.
- Pin taxonomy, prompt, model, schema, normalization, and algorithm versions.
- Use temperature zero where supported and still validate output.
- Canonically sort unordered identifiers by Unicode code point.
- Inject a logical clock into time-dependent computations.
- Use deterministic tie-breaking.
- Treat identical inputs with different model versions as different derivations.

## Failure model

Proposed terminal categories include:

- unsupported_input;
- malformed_output;
- schema_invalid;
- evidence_integrity;
- duplicate_integrity;
- provenance_missing;
- entity_conflict;
- temporal_conflict;
- story_membership_ambiguous;
- budget_exhausted;
- provider_failure;
- persistence_failure.

Recovery budgets require a later accepted ADR. Phase 5 failures never change the Phase 4 run's validation outcome or create a new Phase 4 processing run.

## Evaluation

Required labeled sets:

- event spans/types and event field correctness;
- entity mentions, matches, non-matches, and hard ambiguous cases;
- temporal intervals and uncertainty;
- comparable/non-comparable claim pairs;
- contradiction types and false friends;
- Story membership, split, and merge scenarios;
- novelty and non-novel syndicated copies;
- confidence outcomes and coverage expectations;
- multilingual and adversarial Unicode cases.

Metrics are reported per language, publisher cohort, event type, and content length. Aggregate scores cannot hide high-risk cohort failures.

## Open questions

1. What event taxonomy balances editorial usefulness with stable classification?
2. Which facts require direct quote evidence versus a validated source-field reference?
3. What false-merge thresholds apply to people, organizations, locations, and Stories?
4. Is human entity/story correction in Phase 5.2 or deferred to an editorial tool?
5. Which provider boundaries are approved for future multi-model evaluation?
6. What is the maximum permitted derivation latency and cost per source?
