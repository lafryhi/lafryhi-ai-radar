# Phase 5 Source Intelligence Specification

## Status

Proposed architecture only. This specification does not authorize implementation, schema changes, or changes to the frozen v1.0.0-rc1 ingestion and publication pipeline.

## Purpose

Source Intelligence creates versioned observations about where coverage comes from, how consistently a publisher performs, whether records are copies or variants, how independent corroboration may be, and where sources conflict. It supplements—but never replaces—the operator-controlled publisher registry and trust configuration.

## Design boundaries

- A `SourceRecord` remains immutable and authoritative for what entered the pipeline.
- Publisher trust remains an operator-managed configuration, not a computed score.
- Source reputation is advisory, historical, uncertainty-aware, and reversible.
- Duplicate classification never deletes records or evidence.
- Cross-source agreement does not make invalid evidence acceptable.
- Source text is not copied into telemetry or derived operational metrics.
- All transformations identify their algorithm and normalization versions.

## Conceptual model

### Source Intelligence Profile

A versioned profile references a publisher and evaluation window and contains:

- observation count and time coverage;
- successful fetch and parse rates;
- validation, correction-regeneration, and terminal-failure rates;
- evidence-integrity pass rate;
- correction and retraction observations, when reliably available;
- exact-duplicate and near-duplicate proportions;
- originality/lead observations;
- language consistency;
- common-origin and publisher-cluster signals;
- cross-source corroboration and conflict observations;
- component confidence intervals;
- eligibility state such as insufficient data, observational, or advisory;
- algorithm and schema versions.

It contains no authorization decision and cannot enable, disable, approve, or publish anything.

### Source Observation

A Source Observation is an immutable, provenance-linked measurement about one source record or processing outcome. Profiles aggregate observations; they do not rewrite them.

## Publisher trust evolution

Publisher trust has two distinct meanings and must remain separated:

1. **Publisher trust configuration** — the existing operator decision controlling whether and how a publisher participates.
2. **Observed source reputation** — a Phase 5 advisory summary of historical behavior.

Evolution is proposed as an operator workflow:

- profiles begin as `insufficient_data`;
- after a documented minimum sample and time window, they become `observational`;
- after calibration and policy approval, selected components may become `advisory`;
- an operator may use advisory information when reviewing the registry;
- any trust-configuration change remains explicit, authenticated, audited, and outside automated scoring.

No reputation threshold automatically changes source status.

## Source reputation

### Component signals

| Signal | Meaning | Required controls |
|---|---|---|
| Availability | Fetch success over eligible attempts | Separate publisher failures from platform failures |
| Parseability | Records yielding usable normalized content | Version by extractor; do not punish publishers for known platform defects |
| Validation quality | Fraction of analyses passing schema and integrity checks | Attribute model-caused failures separately |
| Evidence grounding | Rate of evidence-integrity success | Do not expose quote content |
| Timeliness | Delay between claimed publication and observation | Represent clock uncertainty and updates |
| Originality | Likelihood of leading rather than copying a story | Correct for syndication and shared ownership |
| Correction behavior | Observable corrections/retractions and their latency | Require reliable correction detection |
| Cross-source agreement | Claims corroborated by plausibly independent sources | Weight independence; avoid popularity as truth |
| Conflict rate | Claims contradicted under the same scope/time | Preserve unresolved status; do not assume the minority is wrong |
| Metadata consistency | Stable publisher, language, author, and time metadata | Treat missing data separately from false data |

### Aggregation rules

- Publish components, sample sizes, windows, and uncertainty—not a context-free universal truth score.
- If a composite is needed for operator sorting, it is a versioned policy projection over components.
- Apply minimum samples and shrink sparse results toward an explicitly documented prior.
- Use bounded time windows plus lifetime observations.
- Never use locale-sensitive sorting or comparison.
- Correct for common-origin coverage before calculating corroboration.
- Attribute failures to publisher, provider, extractor, or platform only when classification supports it.

## Source reliability history

History is append-only by observation and queryable by fixed windows. A profile version identifies:

- evaluation interval;
- observation cutoff;
- included algorithm versions;
- exclusions and their reasons;
- late-arriving adjustments as a new profile version;
- superseded profile reference.

Historical values are not backfilled invisibly when algorithms change. Recalculation produces a new version so operators can distinguish real publisher change from measurement change.

## Duplicate detection

### Exact duplicates

Exact duplicate classification requires equality of versioned deterministic fingerprints derived from the approved normalized payload. It should use multiple signals:

- canonical-content fingerprint;
- publisher-scoped content fingerprint;
- canonical URL identity;
- optional normalized-title fingerprint;
- immutable source identifiers.

An exact match may choose a canonical representative for a view, but every record remains retained and provenance-linked.

### Duplicate conflict rule

Records sharing a purported identity but differing in meaningful normalized fields are conflicts, not duplicates to be collapsed. Conflict validation occurs before view suppression.

Examples include:

- same publisher record ID with different content fingerprint;
- same canonical URL with materially different publisher or article identity;
- same content fingerprint with incompatible publication metadata;
- same syndication identity with divergent substantive claims.

## Near-duplicate detection

Near-duplicate detection estimates whether two records convey substantially the same article or wire copy. It may use:

- token shingles and MinHash;
- locality-sensitive candidate generation;
- deterministic lexical similarity;
- title and lead overlap;
- paragraph-order similarity;
- named-entity and event overlap;
- optional versioned embeddings for candidate scoring only.

Architecture rules:

- candidate generation and final classification are separate;
- thresholds are versioned by language and content type;
- high-risk pairs remain separate when uncertain;
- the reason and component scores are retained;
- embedding similarity cannot validate evidence or independently merge identities;
- distinct updates to a long-running story are related coverage, not necessarily near-duplicate articles.

## Language detection

Language is an observation with:

- BCP 47 language tag where supported;
- confidence;
- detector and model version;
- detected script;
- multilingual/mixed indicator;
- insufficient-text indicator;
- registry-language comparison.

Detection order:

1. Validate declared metadata without trusting it blindly.
2. Run a deterministic/version-pinned detector over normalized content.
3. Detect script and mixed-language conditions.
4. Preserve declared and detected values when they disagree.
5. Route unsupported or uncertain language to an explicit state.

Language detection must not translate or modify the source used for exact evidence validation.

## Publisher clustering

Publisher clustering estimates shared ownership, domain families, syndication, content origin, or coordinated reuse. It uses explainable edges such as:

- registry ownership metadata;
- domain and certificate lineage when legally and operationally appropriate;
- stable byline or feed relationships;
- repeated exact/near-duplicate lead timing;
- explicit syndication attribution;
- recurring canonical links;
- common content templates separated from article body.

Clusters are versioned hypotheses with confidence and evidence references. They must not label coordination as malicious, and they must not determine authorization. Cross-source corroboration discounts likely common-origin members rather than treating them as independent votes.

## Source fingerprinting

### Fingerprint families

| Fingerprint | Input | Purpose |
|---|---|---|
| Fetch fingerprint | Exact fetched bytes plus fetch metadata version | Repeated-response detection and diagnostics |
| Extracted-content fingerprint | Approved extracted article representation | Extractor regression and identity |
| Canonical-content fingerprint | Versioned normalized semantic-preserving content | Exact duplicate candidates |
| Structural fingerprint | Heading/paragraph shape without protected telemetry | Template and layout change observation |
| URL identity fingerprint | Canonical URL components | URL alias detection |
| Publisher fingerprint | Registry identity and verified domains | Publisher identity |

Fingerprints are cryptographic where identity or integrity depends on collision resistance. Hashes of short evidence strings are prohibited. Fingerprints must not be logged as a workaround for content-logging restrictions unless their input and reidentification risk are approved.

### Versioning

Fingerprint identity includes algorithm, normalization version, and input class. Fingerprints from different versions are not directly equated without an explicit compatibility rule.

## Normalization strategy

Normalization has layered outputs so a transformation used for discovery cannot silently alter the authoritative source:

1. **Raw fetch reference** — protected retention subject to current policy.
2. **Existing extracted SourceRecord** — frozen Phase 4 input.
3. **Identity normalization** — deterministic operations approved for exact fingerprinting.
4. **Discovery normalization** — additional reversible features for candidate generation.

Allowed identity-normalization operations must be explicitly enumerated and tested. Proposed defaults include Unicode NFC and documented line/outer-whitespace handling. NFKC, case folding, punctuation removal, transliteration, stemming, and translation are discovery-only features and cannot establish exact identity or evidence validity.

Normalization changes create a new version and never mutate historical hashes.

## Canonical URL strategy

Canonicalization is deterministic, publisher-aware, and conservative.

### Safe candidates

- lower-case scheme and host;
- normalize an internationalized host through one pinned IDNA version;
- remove a default port;
- resolve dot segments;
- remove a fragment;
- apply a publisher-approved trailing-slash rule;
- remove only allowlisted tracking parameters;
- sort retained query parameters by code-point order;
- honor a valid canonical link only when publisher/domain policy permits it.

### Unsafe automatic operations

- removing unknown query parameters;
- treating different paths as equal because titles match;
- following cross-domain canonical links without an approved relationship;
- decoding reserved URL characters into a different resource;
- case folding path segments;
- selecting the shortest URL as canonical.

The system preserves original URL, redirect chain, declared canonical URL, calculated canonical URL, ruleset version, and conflicts.

## Conflict detection

A conflict is emitted when two observations share a comparison scope and assert incompatible values. The model distinguishes:

- identity conflict;
- metadata conflict;
- temporal conflict;
- quantitative claim conflict;
- categorical claim conflict;
- attribution conflict;
- source-versus-registry conflict;
- correction/update relationship;
- unresolved apparent conflict.

Each conflict contains both provenance paths, scope, time applicability, detector version, and confidence. It never discards either side and does not decide truth without sufficient grounded evidence.

## Cross-source validation

Cross-source validation measures corroboration, independence, and disagreement:

1. Convert grounded analysis into comparable claims.
2. Establish entity, time, unit, and scope compatibility.
3. Estimate common origin using fingerprints and publisher clusters.
4. Compare only compatible claims.
5. Mark support, contradiction, update, or incomparable.
6. Aggregate independent support with uncertainty.

This layer validates a derived claim's cross-source support, not a Phase 4 quote. A quote still must occur in its own source under the exact evidence contract.

## Deterministic identity

Proposed namespaces:

- profile: derived from publisher ID, window, cutoff, and algorithm version;
- observation: derived from source record ID, observation type, and algorithm version;
- duplicate pair: derived from ordered record IDs and classifier version;
- cluster version: derived from sorted membership inputs and algorithm version;
- conflict: derived from ordered claim IDs, scope, and detector version.

Exact encoding and hash algorithms require an accepted ADR before implementation.

## Failure behavior

- Unsupported language: retain the record and emit an explicit unsupported result.
- Insufficient data: do not score; expose `insufficient_data`.
- Normalization conflict: retain all variants and stop exact deduplication for the pair.
- Classifier uncertainty: do not suppress.
- Processor failure: record a bounded failure category and leave Phase 4 unaffected.
- Algorithm change: create a new derived version; never silently reclassify history.

## Privacy and security

- Operational telemetry contains IDs only where approved, bounded categories, numeric measures, versions, and durations.
- Source text, raw HTML, evidence quotes, and model output are excluded.
- External source content is untrusted and may be adversarial.
- URL handling prevents credential-bearing URLs from telemetry.
- Reputation access follows operator authorization but is not itself an authorization control.

## Future extensibility

The design supports:

- new languages through versioned language-specific policies;
- audio, video, transcript, and social sources with distinct extraction contracts;
- signed publisher metadata and provenance standards;
- external fact-checking references;
- additional fingerprint algorithms;
- ownership and syndication knowledge graphs;
- privacy-preserving aggregate sharing;
- multi-region processing;
- human adjudication feedback as append-only labeled observations.

Every extension must preserve the authoritative source snapshot and exact evidence boundary.

## Acceptance evidence

Required before activation:

- versioned labeled corpora with exact duplicate, near-duplicate, conflict, language, and canonical URL labels;
- per-language precision/recall and false-merge reports;
- sparse-publisher reputation behavior;
- common-origin and syndication evaluation;
- deterministic repeated runs;
- adversarial URL and Unicode tests;
- privacy/cardinality audit;
- shadow-mode comparison and rollback rehearsal.

## Open questions

1. Which normalization operations are already implicit in the current `SourceRecord`, and can they be reproduced exactly?
2. Which publishers have sufficient ownership and syndication metadata?
3. What minimum sample and time window qualifies a reputation component for advisory use?
4. Which languages receive first-class thresholds rather than an unsupported state?
5. May embeddings leave the current trust boundary, and what retention rules apply?
6. Who adjudicates canonical URL and publisher-cluster disputes?
