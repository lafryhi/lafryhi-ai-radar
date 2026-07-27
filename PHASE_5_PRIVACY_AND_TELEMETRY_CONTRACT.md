# Phase 5 Privacy and Telemetry Contract

## Status and scope

- Status: Approved for deterministic offline Phase 5.1 implementation
- Approval date: 2026-07-27
- Accountable owner: Security and Privacy Owner
- Responsible roles: Operations Owner; Architecture Owner
- Scope: Test-local diagnostics and future design constraints
- Production telemetry change: Not authorized

Feature flags are operational controls, not security boundaries. Deterministic IDs support integrity and idempotency; they are not authorization mechanisms.

## Data classes

| Class | Description | Example |
|---|---|---|
| T0 Public taxonomy | Non-sensitive fixed enums and contract versions | status category, schema version |
| T1 Operational bounded | Low-sensitivity counts/durations with controlled cardinality | duration, artifact count |
| T2 Restricted identifiers | Opaque IDs or pseudonymous actor identifiers requiring operational access | processing run ID |
| T3 Protected content | Source/editorial/model content and personal data | article body, evidence quote |
| T4 Secret/authentication | Credentials or security material | API key, cookie, authorization header |

T3 and T4 are prohibited from telemetry. T2 requires explicit field justification and restricted access.

## Field allowlist

Only fields registered with name, type, maximum size/range, cardinality class, retention class, and access class may be emitted.

| Field category | Permitted values | Bounds/conditions |
|---|---|---|
| Counters | Non-negative integer counts | Saturate at the contract maximum; no unbounded arrays |
| Durations | Integer milliseconds | Non-negative; bounded to seven days unless a contract states less |
| Status classifications | Fixed enum | Unknown is explicit; no exception prose |
| Model identifiers | Approved provider/model enum | No endpoint, credential, or free-form model response |
| Version identifiers | Prompt/schema/algorithm/normalization version | ASCII allowlist; maximum 128 characters |
| Retry counts | Non-negative integer | Per-task documented ceiling |
| Artifact counts | Non-negative integer | Aggregate only; maximum 1,000,000 per event |
| Score ranges | Integer basis points or bounded decimal | `[0, 1]` or `[0, 10,000]`; no source text |
| Aggregate error categories | Fixed taxonomy | No dynamic exception or field value |
| Opaque diagnostic identifiers | Existing approved IDs | T2 access; never authorization |
| Hashed diagnostic identifiers | Collision-resistant digest over sufficiently large non-content identity material | Requires SP approval; prohibited for evidence quotes, short strings, contact data, secrets, or reidentifiable content |
| Logical cutoff | ISO timestamp or epoch integer | Fixed input to deterministic evaluation |
| Feature-control state | Fixed boolean/enum | Operational observation only, never security evidence |

Phase 5.1 may emit these only to a test-local in-memory or ephemeral evaluation sink. No production emitter is authorized.

## Field denylist

The following are prohibited in logs, metrics, traces, telemetry events, alert payloads, and unrestricted evaluation reports:

- raw Gemini or other model output;
- source article body, raw HTML, or extracted article text;
- evidence quote text;
- mismatching or neighboring characters;
- prompt bodies or prompt fragments;
- operator credentials;
- cookies;
- authorization headers;
- secrets, API keys, access tokens, refresh tokens, private keys, or connection strings;
- personal contact data;
- full unpublished editorial notes;
- free-form operator comments;
- URLs containing credentials or query strings;
- dynamic exception prose that may contain input;
- unbounded payload dumps, objects, arrays, stacks, or request/response bodies;
- hashes of short quote strings or other small protected inputs.

## Retention classes

| Class | Intended data | Maximum retention | Deletion behavior |
|---|---|---:|---|
| RET-0 | Ephemeral unit/evaluation event buffers | End of test process | Discard automatically |
| RET-1 | Deterministic aggregate validation reports | 90 days | Delete by versioned retention job/manual repository cleanup |
| RET-2 | Release/gate evidence containing bounded aggregates | Life of supported release plus 1 year | Governance-approved deletion |
| RET-3 | Restricted incident audit metadata | Per security/legal policy; unresolved | Threshold unresolved before production telemetry |

Phase 5.1 uses RET-0 and documentation-only RET-2 evidence. RET-3 is not authorized until its period is approved.

## Access roles

| Data | Access |
|---|---|
| T0 | Project roles as operationally appropriate |
| T1 evaluation aggregates | Architecture, Evaluation, Reliability, Operations |
| T2 restricted identifiers | Security and Privacy, Operations; others only by documented need |
| Incident evidence | Security and Privacy Owner; Operations Owner |
| Corpus content | Data Governance and Evaluation under corpus policy |

Access is enforced by repository/environment controls, not by identifier obscurity or feature flags.

## Redaction and rejection rules

1. Prefer construction from an allowlist; redaction is secondary defense.
2. Reject an event containing unknown fields.
3. Replace unexpected dynamic values with a fixed category, not a sanitized excerpt.
4. Remove URL user information, query, and fragment before any approved host/path diagnostic.
5. Never truncate protected content into a permitted field.
6. Never hash prohibited small content as a substitute for logging it.
7. Bound strings before serialization and numbers before aggregation.
8. Treat serialization failure as a dropped telemetry event with a fixed local counter; never block the pipeline.

## Aggregation requirements

- Use minimum cohort sizes before reporting publisher/language/operator slices; the initial minimum is unresolved and blocks production aggregate exposure.
- Do not emit article-level content-derived features to unrestricted metrics.
- Keep high-cardinality identifiers out of dashboards.
- Reconcile aggregates to authoritative state only through approved read-only processes.
- Suppress empty cohorts and avoid differencing attacks.
- Record metric definition and aggregation version.

## Production logging boundary

No Phase 5.1 production logging change is authorized. A later proposal must:

- pass an independent security/privacy review;
- define RET-3;
- prove allowlist enforcement;
- test adversarial source/prompt/exception content;
- document access and incident handling;
- deploy independently of feature authorization where feasible.

Application logs remain subject to existing Phase 4 privacy rules.

## Offline evaluation logging boundary

Offline evaluation may record:

- fixture/sample ID;
- corpus version;
- algorithm/normalization version;
- expected and actual fixed category;
- bounded numeric measurements;
- pass/fail invariant identifiers.

It must not copy corpus text into reports. Failure reports reference immutable sample IDs; authorized reviewers inspect the corpus separately.

## Model prompt and response logging

- Prompt bodies and model responses are never logged.
- Model/provider identifiers and prompt versions may be logged under the allowlist.
- Phase 5.1 permits no model calls.
- Any later model task requires its own data-flow review, provider boundary, budget, and recovery decision.

## Incident evidence policy

If prohibited data is detected:

1. Stop the affected emitter/consumer.
2. Preserve bounded metadata about detection time, field name, revision, and category without copying the value.
3. Restrict access and follow incident-response policy.
4. Determine affected stores and retention windows.
5. Delete exposed telemetry only under approved incident procedure; do not delete authoritative source/review/publication evidence.
6. Add a deterministic regression fixture using synthetic markers, not the exposed content.

## Deletion and correction

- Retention deletion applies only to telemetry/evaluation reports, not authoritative records.
- Deletion is scoped by class and version and is auditable.
- Corrected metrics append a corrected aggregate version; they do not silently rewrite incident evidence.
- Incorrect classification creates a superseding taxonomy/report version.
- Corpus deletion follows `PHASE_5_EVALUATION_CORPUS_GOVERNANCE.md`.

## Validation requirements

- Unknown-field rejection.
- Every allowed string and number boundary.
- Adversarial secrets, articles, quotes, prompts, URLs, Unicode, and exception fixtures.
- Proof that no denied field name/value reaches serialized output.
- Proof that failures in telemetry do not affect deterministic outputs.
- Stable aggregate results across repeated runs.

## Accepted limitations

- No independent reviewer is assigned; this is non-blocking for offline test-local diagnostics and blocking before production telemetry.
- Production retention and cohort-size thresholds are unresolved and not authorized.
- Hashed diagnostics require case-specific approval and are not generally enabled.
