# Shadow Readiness Certification

## Certification decision

The repository is engineering-ready for preparation of a first controlled shadow
evaluation, subject to the run-specific manual approvals and open-risk acceptance in
this report. This is not authorization to call a model, deploy, create traffic, create
a canary, publish, or promote a candidate.

## System and architecture

LAFRYHI AI Radar uses an immutable production model (`gemini-2.5-flash`) for Signal and
Decision Intelligence, followed by deterministic Editorial Policy Engine v1.1 and
mandatory human review. Candidate execution is evaluation-only, isolated, redacted,
non-persistent, and incapable of changing the returned production result.

Completed evidence includes harness validation, prompt-contract repair, Gemini
migration stabilization, candidate evaluation, availability diagnostics, evaluation
integrity repair, Editorial Policy Engine v1, and calibration v1.1.

## Certification evidence

- Machine checklist: `release/shadow-readiness.json`
- Release manifest: `release/release-manifest.json`
- Risk authority: `release/risk-register.json`
- Shadow specification: `docs/CONTROLLED_SHADOW_SPEC.md`
- Policy constitution: `config/editorial-policy.v1.1.json`
- Dataset: `eval/datasets/gemini-migration.json`
- Semantic fixture: `eval/datasets/gemini-migration.editorial-context.json`
- Automated schemas and validator: `src/services/release-governance.ts` and
  `src/services/shadow-readiness.ts`

## Version and traceability controls

Certification pins dataset `1.0`, fixture `editorial-context-v1.1`, policy and
constitution `editorial-policy-v1.1`, evaluation
`gemini-migration-evaluation-v2.6`, and report `gemini-migration-report-v1.1`. Mixed
versions abort preflight.

Each future case receives deterministic, distinct evaluation, case, signal, decision,
policy, review, and publication trace IDs. The publication identifier is an audit-chain
identifier only and does not imply publication. Together with sanitized raw-model and
policy outputs, these links let a reviewer reconstruct the decision without model-name
or prompt ambiguity.

## Validation and policy summary

Phase 3.1 completed with 228 tests before Phase 4 additions. Phase 4 certification
raises the local suite to 258 tests across 27 files after the Phase 5.1 harness repair, plus successful typecheck,
lint, build, dataset validation, and zero-call policy replay. Policy calibration
preserved all known safety corrections, eliminated the known EP-007 false positive,
never automatically upgraded a position, and retained mandatory application review.
Phase 4 validation totals are recorded in the release manifest after the final suite.

## Open issues and risks

The synthetic 15-case dataset is not production evidence. Candidate behavior can drift,
live request/token cost remains uncertain, and reviewer capacity must be confirmed.
These are tracked as RISK-005, RISK-007, RISK-008, and RISK-011. No live shadow evidence
exists yet.

## Go / No-Go criteria

Go for a future controlled shadow run requires all automatic checks to pass again using
the exact transient run configuration, plus operator, editorial, security, cost, and
review-capacity approval. Any production-model mismatch, nonzero traffic, write or
publication capability, invalid path/dataset/policy/version, disabled review pipeline,
privacy failure, or unaccepted open risk is an immediate no-go.

Production remains `gemini-2.5-flash`. Candidate `gemini-3.1-flash-lite` remains
evaluation-only and is not approved for canary or production use.

## Phase 5.1 certification amendment

The first controlled shadow report remains invalid. Its expectation checker used raw
lowercased substring matching while EP-006 used independent normalized token matching.
The implementations could disagree, and redaction removed the text needed to adjudicate
them. The report also predates mandatory report-contract v1.1 metadata.

Before a separately authorized rerun, offline forensics, canonical-detector fixture
replay, tests, typecheck, lint, build, dataset validation, dry-run, and policy replay
must pass.

## Phase 5.2.1 budget certification

The controlled workflow uses dataset case 1 as its availability gate. There is
no separate smoke invocation: 4 gate requests plus 56 continuation requests
equals the certified ceiling of 60. The first case remains in the normal report
and traceability chain. A shared counter refuses request 61.
