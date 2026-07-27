# Phase 5 Operational Intelligence Specification

## Status

Proposed architecture only. No dashboard, telemetry writer, storage change, or alert is authorized by this document.

## Purpose

Operational Intelligence provides privacy-safe, reconcilable visibility into model usage, estimated cost, pipeline performance, recovery, source quality, publication outcomes, operator actions, queue health, and error trends. Observability must never become a second content store or a dependency that blocks production processing.

## Principles

- Allowlist fields; do not rely only on redaction.
- Record categories and bounded numbers, never protected content.
- Separate events from aggregates and authoritative state.
- Label estimates as estimates.
- Use low-cardinality dimensions and explicit retention.
- Make every dashboard definition versioned and reconcilable.
- Use server-side timestamps plus logical operation timestamps.
- Treat dashboard outage as non-blocking to the pipeline.
- Preserve the Phase 4 verification-status taxonomy.

## Telemetry safety contract

### Never permitted

- article or source text;
- evidence quote text;
- raw Gemini or other model output;
- prompt bodies;
- mismatching characters;
- credentials, tokens, secrets, cookies, or authorization headers;
- URLs containing query strings or credentials;
- exception prose that may embed protected inputs;
- hashes derived from short quote strings;
- unrestricted user-entered text;
- unbounded arrays or field paths.

### Permitted with bounds

- opaque run, analysis, review, Story, and policy identifiers where access policy permits;
- event and terminal category enums;
- model and prompt version;
- schema, algorithm, and policy version;
- attempt/retry/regeneration counts;
- bounded lengths and mismatch classifications already approved;
- durations, counts, rates, token accounting, and estimated cost;
- feature-control state;
- repository adapter and deployment revision;
- operator action type and pseudonymous operator ID;
- source/publisher ID in restricted operational views;
- verification status.

Each field has type, bound, cardinality class, sensitivity class, owner, and retention.

## Event architecture

### Operational event envelope

- event name and version;
- event ID;
- occurred-at and observed-at;
- correlation/run ID;
- component;
- environment and revision;
- bounded dimensions;
- numeric measurements;
- outcome/status;
- privacy classification.

Events are append-only inputs to idempotent metric projectors. Projectors identify the last processed event and tolerate duplicates. Aggregates are rebuildable within retention limits.

### Reconciliation

For critical counts, a scheduled read-only reconciliation compares aggregate metrics with authoritative repository states. Discrepancies create an alert and a new corrected aggregate version; they do not rewrite domain records.

## Dashboard: Gemini usage

### Questions

- How many model calls occur by task, model, prompt, outcome, and revision?
- How frequently are retries and regeneration used?
- Are ceilings respected?
- How complete is provider usage accounting?

### Metrics

- initial calls;
- retry calls;
- compact/correction regeneration calls;
- calls per processing run distribution;
- token input/output counts when supplied by the provider;
- missing-accounting rate;
- terminal provider and validation categories;
- ceiling-exhaustion count.

### Guardrails

- Never expose prompt/output content.
- Alert when calls exceed the documented task ceiling.
- Keep Phase 4 and new Phase 5 task budgets distinct.

## Dashboard: Cost

### Metrics

- estimated model cost by task/model/prompt/revision;
- estimated cost per successful analysis, Story Version, and editorial draft;
- retry/regeneration cost contribution;
- daily/weekly/monthly estimate;
- budget consumption and forecast;
- percentage with incomplete token accounting.

Cost is calculated from a versioned price table and available usage. It is explicitly labeled `estimated`; provider invoices remain the accounting authority.

## Dashboard: Pipeline duration

### Stage metrics

- fetch/extraction;
- initial model call;
- recovery;
- validation;
- readiness finalization;
- time pending human review;
- approval/publication;
- Phase 5 source, analysis, story, and editorial derivation.

Report p50, p90, p95, p99, maximum, sample count, timeout/exclusion count, and end-to-end duration. Histograms use stable buckets. Clock-skew and incomplete-stage cases are explicit.

## Dashboard: Recovery statistics

### Metrics

- recovery actions by type;
- retry, regeneration, and repair counts;
- recovery duration;
- recovery success/exhaustion rate;
- terminal failure category;
- evidence mismatch classification and bounded lengths;
- provider versus validation versus persistence recovery;
- call-ceiling utilization.

No quote/source/raw output is included. A spike in correction regeneration is correlated by prompt/model/schema version, not content.

## Dashboard: Source quality

### Metrics

- fetch and parse success;
- supported/uncertain language rate;
- evidence-integrity pass/fail;
- exact and near-duplicate proportion;
- canonical URL conflicts;
- cross-source conflicts;
- source freshness;
- reputation-component samples and uncertainty;
- common-origin-adjusted corroboration.

This dashboard displays observations, not authorization or a defamatory truth rating. Access is restricted and explanations accompany composite views.

## Dashboard: Publication metrics

### Metrics

- pending, approved, rejected, and published counts;
- publication success/conflict/idempotent outcomes;
- publication latency after approval;
- Story/topic/source distributions;
- corrections or superseding publications if later modeled;
- duplicate-publication invariant count.

Counts reconcile to authoritative review and publication state. Phase 5 scores do not change those states.

## Dashboard: Operator actions

### Metrics

- review opened;
- explicit approval/rejection;
- reason-code distribution;
- entity/story correction;
- ranking/lifecycle feedback;
- idempotent repeated action;
- authentication/authorization failure category.

Operator identity is pseudonymous in aggregate views and available only to authorized audit views. Free-form comments are excluded from telemetry.

## Dashboard: Queue health

### Metrics

- queue depth by age band and priority band;
- oldest pending review;
- stale processing/derivation jobs;
- work arrival and completion rate;
- blocked/error states;
- unassigned versus in-review;
- duplicate-suppressed view count;
- queue reconciliation discrepancy.

Priority is labeled with Editorial Assessment version. A Phase 5 outage must permit the baseline queue to remain usable.

## Dashboard: Approval latency

Measure:

- readiness-to-first-open;
- first-open-to-decision;
- readiness-to-decision;
- decision-to-publication;
- distribution by bounded source/topic/priority cohorts;
- censoring for still-pending reviews.

Do not interpret latency as operator performance without workload, coverage, and risk context.

## Dashboard: Throughput

Track:

- sources fetched;
- records normalized;
- runs started/completed;
- analyses validated;
- reviews created/decided;
- publications committed;
- Phase 5 artifacts produced;
- failure/recovery rate;
- backlog change.

Use rates and absolute counts with sampling/completeness annotations.

## Dashboard: Error classification

Maintain a stable hierarchy:

- provider;
- configuration/authentication/authorization;
- parsing;
- schema;
- evidence integrity;
- duplicate integrity;
- source extraction;
- source identity/canonicalization conflict;
- entity/temporal/story integrity;
- persistence;
- concurrency/idempotency;
- operator workflow;
- publication conflict;
- environment/dependency;
- verification limitation.

Unknown is valid and monitored. Exception prose is not a dimension. Classification changes create a new taxonomy version.

## Trend monitoring

Trend views include:

- rolling baselines by weekday/time cohort;
- version-change annotations;
- drift by model, prompt, source, language, and algorithm;
- error/recovery/cost/latency anomalies;
- source quality and duplication shifts;
- approval-latency and queue changes;
- confidence-calibration drift;
- alert suppression and incident annotations.

Anomaly detection initially uses deterministic thresholds and robust statistics. Model-based anomaly detection, if considered later, remains advisory and versioned.

## Alert design

Every alert defines:

- metric/query and version;
- threshold and evaluation window;
- minimum sample;
- severity;
- owner and escalation;
- runbook;
- suppression/cooldown;
- safe diagnostic fields;
- clear/reset condition;
- test scenario.

Critical examples include sensitive telemetry detection, Gemini ceiling breach, automatic publication, duplicate/orphan invariant, queue outage, persistence-integrity conflict, and sustained error spike.

## Access and retention

- Public product metrics, operator operational metrics, and restricted security/audit metrics are separate.
- Least-privilege access is enforced outside the metric value itself.
- Raw safe events have the shortest practical retention.
- Aggregates retain only necessary dimensions.
- Operator audit retention follows policy/legal requirements.
- Deletion/retention jobs do not affect authoritative domain records.

## Dashboard delivery strategy

1. Approve event dictionary and privacy classification.
2. Emit events in shadow and audit cardinality/content.
3. Reconcile sample aggregates.
4. Release internal read-only dashboards.
5. Test alerts without paging.
6. Activate paging per runbook.

No dashboard is placed on the synchronous pipeline critical path.

## Acceptance criteria

- Privacy corpus and adversarial strings produce no forbidden fields or values.
- Cardinality stays within approved budgets.
- Counts reconcile to authoritative sampled records.
- Percentiles reproduce from fixture events.
- Duplicate delivery does not double-count.
- Clock and missing-stage behavior is deterministic.
- Cost displays accounting coverage and price-table version.
- All critical alerts pass synthetic tests.
- Dashboard removal leaves production behavior unchanged.

## Open questions

1. Which metrics backend and retention tiers meet cost and access requirements?
2. What identifiers are acceptable in restricted telemetry?
3. Who owns price-table updates and invoice reconciliation?
4. What service-level objectives and alert thresholds are actionable?
5. Which dashboards require near-real-time freshness?
6. What legal retention applies to operator audit information?
