# Gemini Migration Candidate Evaluation

## Phase 3: raw versus policy-adjusted evaluation

Evaluation preserves raw model status, recommendation, validation, evidence, and latency
metrics. A separate deterministic Editorial Policy Engine result records the effective
position, action, reasons, rule IDs, and mandatory-review state. Policy adjustments never
rewrite raw results or make a failing model appear successful.

Comparative reports now include raw and adjusted recommendation agreement, override,
downgrade, block, human-review, forbidden-term detection, over-escalation correction,
excessive-conservatism correction, and out-of-policy correction rates. See
[EDITORIAL_POLICY_ENGINE.md](EDITORIAL_POLICY_ENGINE.md).

Phase 3.1 makes those dimensions explicit: effective-position changes are separate
from the selected action, additional policy review is separate from mandatory
application review, and conversion from `INSUFFICIENT_EVIDENCE` to a pending path is
reported separately from ordinal downgrade. Policy replay validates the versioned
evaluation-only semantic context fixture and still performs zero model calls.

## Safety boundary

This framework is local and disabled by default. It does not use Firestore, publication services, browser APIs, cookies, sessions, or public endpoints. Baseline output always remains authoritative. Candidate failures are isolated. Reports redact source bodies by default and never include environment dumps, credentials, tokens, or service-account data.

`gemini-2.5-flash` remains the production model. The commented `gemini-3-flash-preview` value is an evaluation example only, not a production recommendation. Evaluation success never authorizes a cutover.

## Dataset

`eval/datasets/gemini-migration.json` conforms to the versioned `gemini-migration.schema.json` contract and the application’s current `BusinessContextSchema`. Cases use concise synthetic English, French, and Arabic sources. Each case declares deterministic expectations for evidence, status, decision values, keywords, forbidden claims, and insufficient evidence.

## Commands

- `npm run eval:gemini:validate` validates configuration and the dataset without model calls.
- `npm run eval:gemini:dry-run` prints selected case IDs and sanitized configuration without model calls.
- `npm run eval:gemini:run` requires explicit enablement, a distinct candidate, and Google Cloud configuration. It makes local Vertex calls and writes only below the configured result directory.
- `npm run eval:gemini:report -- <report.json>` regenerates Markdown and CSV text from an existing report without model calls.

For a controlled run, export `GEMINI_EVALUATION_ENABLED=true` and a non-production `GEMINI_EVALUATION_CANDIDATE_MODEL`, authenticate locally with approved Application Default Credentials, validate, dry-run, and then run. Never use this command in deployment automation.

## Configuration

Evaluation controls cover enablement, candidate, dataset/output paths, concurrency (1–5), timeout, maximum cases, deterministic sample rate, raw-output retention, and input redaction. Paths must be relative and cannot traverse outside the repository. Raw outputs default off; redaction defaults on.

## Metrics

Reports include request, JSON, schema, application, quotation, evidence-ID, enum, pipeline, insufficient-evidence, latency, attempts, fallback, timeout, token-metadata, agreement, score/confidence/relevance/evidence drift, deterministic keyword, unsupported-claim, and quotation-mismatch metrics.

Metric boundaries are independent:

- transport/request success means the generation request completed without a transport or service error;
- response received means non-empty model text was returned;
- JSON success means the original response text parsed as JSON;
- schema success means an explicitly versioned accepted schema matched;
- application validation means grounding, evidence, and other runtime rules passed;
- pipeline completion means the required stage sequence completed.

A schema or application failure does not retroactively turn a completed request into a request failure. Stage diagnostics include matched schema version, failed stage, sanitized validation errors, request error category, stage durations, missing required keywords, and promotion impact.

Signal evaluation recognizes `signal-intelligence-v1` and reports `legacy-analysis-v1` when the historical analysis schema matches. Legacy matching is diagnostic only; it is not silently converted into the current two-stage production contract.

Keyword checks use Unicode normalization, punctuation-insensitive token boundaries, and explicitly configured alternative groups. They remain deterministic and do not use an AI judge.

## Evaluation integrity

Every evaluation is classified as:

- `VALID`;
- `INVALID_DATASET_EXPECTATION`;
- `INVALID_HARNESS`;
- `INCONCLUSIVE`.

Invalid expectations include required terms that are absent from the synthetic source. Harness defects include internally inconsistent diagnostic states or explicit harness failures. An evaluation with no case completed by both models is inconclusive. When integrity is not `VALID`, the recommendation is `INCONCLUSIVE`; it cannot be canary-eligible and is not marked `NOT_ELIGIBLE` solely because of an evaluation defect.

## Promotion policy

Default gates require 98% pipeline completion, 99% JSON/schema validity, 98% exact evidence, 100% evidence-ID and enum compliance, 95% insufficient-evidence correctness, 90% baseline status agreement, candidate p95 latency within 1.5× baseline, fallback within two percentage points, and timeout at or below 1%. Checks are pass, warning, fail, or critical. One critical human-review invariant blocks promotion.

Reports can say only `NOT_ELIGIBLE`, `ELIGIBLE_FOR_MORE_TESTING`, or `ELIGIBLE_FOR_CANARY`. They never declare production eligibility.

Candidate lifecycle stage is operator-supplied and not independently verified. Preview, experimental, and unknown candidates are capped at `ELIGIBLE_FOR_MORE_TESTING`; only an explicitly marked GA candidate can reach `ELIGIBLE_FOR_CANARY`, and only after every existing quality gate passes.

## Phase 2.5 live-call preparation

Before any live evaluation, use the availability-probe workflow in `GEMINI_CANDIDATE_PROBE.md`. Real probing and evaluation require exact candidate allowlisting, explicit real-call enablement, a run label, and request/input/output ceilings. The default smoke run selects exactly one marked official English case. Probe locations do not alter production location. Probe success means only `AVAILABLE_FOR_EVALUATION`.

Availability is not synonymous with contract compatibility. A successful transport response can still fail raw JSON parsing, response-schema validation, safety/finish checks, or the broader production pipeline. Prose-wrapped and fenced JSON are recorded diagnostically but remain strict failures. `REACHABLE_BUT_CONTRACT_FAILED` blocks smoke evaluation and is never reclassified as model unavailability.

## Reports and interpretation

Each run writes timestamped JSON, Markdown, and CSV files under `eval/results` by default. Review failed cases, warnings, missing metadata, metric drift, and critical invariants. Raw source content is omitted when redaction is enabled.

## Rollback philosophy

The baseline remains authoritative throughout evaluation, so Phase 2 has no production rollback action. A future canary must retain immediate rollback to the last verified GA production model and requires separate approval.

## Known limitations

Quality checks are deterministic and do not use an AI judge. Synthetic cases cannot represent every real source. Token metadata may be absent. Preview model availability, quotas, price, regional support, and behavior can change and must be verified before any later canary.

## Phase 5.1 report admissibility

Evaluation v2.6 and report v1.1 distinguish observations from admissible migration
evidence. Only integrity `VALID` produces `ADMISSIBLE` metrics or a recommendation.
Invalid harness/report-contract runs are `OBSERVATIONAL_ONLY`.

Offline commands `eval:shadow:forensic-validate` and
`eval:forbidden-terms:replay` make zero model calls and writes. The first shadow report
remains invalid.

## Integrated first-case gate

Controlled 15-case shadow runs do not use a separate smoke comparison. The first
case is the fail-closed availability and contract gate, and its results become
case 1 in the normal report. The plan is `15 × 2 models × 2 stages = 60`
requests: four for case 1 and 56 for cases 2–15. Retries count against the same
ceiling.
