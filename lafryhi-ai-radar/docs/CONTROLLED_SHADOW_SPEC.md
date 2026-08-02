# Controlled Shadow Evaluation Specification

## Purpose and scope

The first controlled shadow evaluation compares the immutable production decision path
(`gemini-2.5-flash`) with an evaluation-only candidate. It collects sanitized,
traceable evidence without changing production responses, publication state, Cloud Run
traffic, Firestore, sessions, or human-review outcomes. This specification authorizes
preparation only; it does not authorize model calls, shadow traffic, canary traffic, or
deployment.

## Entry criteria

- `release/shadow-readiness.json` validates with every automatic requirement passing.
- Production and fallback model IDs both equal `gemini-2.5-flash`.
- Candidate differs from production and is labelled `EVALUATION_ONLY`.
- Traffic allocation is zero; Cloud Run and Firestore mutation flags are false.
- Publication capability is false, raw outputs are disabled, and inputs are redacted.
- Dataset, semantic fixture, policy constitution, evaluation, and report versions match
  the compatibility set in `src/services/release-governance.ts`.
- Dataset and policy schemas pass; application human review remains enabled.
- Request, token, case, timeout, and cost ceilings are approved for the specific run.
- An operator and editorial reviewer accept the open risks in `docs/RISK_REGISTER.md`.

## Success and exit criteria

Successful execution requires complete trace IDs, zero production mutations, zero
candidate leakage, zero critical invariants, valid sanitized reports, and metrics for
transport, parsing, schemas, application validation, evidence, policy adjustments,
latency, tokens, and review burden. Exit requires two-person review of the raw and
policy-adjusted results. Success means only that evidence may be considered for a later
phase; it never authorizes canary or production use.

Failure metrics include any transport/schema/application regression, evidence-ID or
quotation failure, publication-capability finding, production-output mutation, missing
trace link, version mismatch, privacy leak, budget breach, critical invariant,
unreviewed policy override, or incomplete report. Any such condition makes the run
inconclusive or failed.

## Rollback and emergency stop

Rollback means stop candidate execution, discard candidate-derived operational action,
retain the production result, preserve sanitized audit evidence, and return shadow
configuration to disabled. Production model, traffic, data, and review state are never
changed, so no production-model rollback should be necessary.

Emergency stop:

1. Stop the local evaluation process.
2. Do not retry or expand the case count.
3. Record the last completed trace identifier and request ceiling.
4. Quarantine any report suspected of containing sensitive data.
5. Confirm zero Firestore/publication/traffic changes.
6. Classify the run `INCONCLUSIVE` and notify Release Engineering, Security, Editorial,
   and Governance as appropriate.

## Operator checklist

1. Verify ADC identity without printing credentials.
2. Load only reviewed transient environment values.
3. Run readiness validation before any model command.
4. Confirm location, candidate allowlist, run label, budgets, and zero traffic.
5. Confirm raw output storage is false and input redaction is true.
6. Start only the explicitly approved case count.
7. Monitor ceilings, failures, and emergency-stop conditions.
8. Preserve report checksums and make no deployment command.

## Reviewer checklist

1. Verify manifest and compatibility versions.
2. Reconstruct at least one full decision chain.
3. Compare raw model, policy-adjusted, and human-review states.
4. Inspect disagreements, forbidden terms, evidence, quotations, and invariants.
5. Confirm the policy never upgraded automatically.
6. Sign off open risks or return a no-go decision.

## Security and publication checklist

- No credential or environment dump.
- No full prompt or source body in reports.
- No public API candidate fields.
- No browser/session/cookie mutation.
- No Firestore or Cloud Run write capability.
- No publication invocation.
- Pending or rejected content never enters the public feed.
- Policy `ALLOW` does not publish; normal application review remains mandatory.

## Human-review guarantee

The chain is `Signal → Decision → Editorial Policy → Human Review`. Candidate output
never replaces the production output or the reviewer. Additional policy review is
recorded separately from the application’s mandatory review.

## Harness and report contract v1.1

Evaluation contract `gemini-migration-evaluation-v2.6` uses the one canonical detector
in `src/domain/forbidden-term-detector.ts`. The expectation checker and EP-006 receive
the same pre-redaction adjudication over the logical `modelOutput` field. Reports retain
only field names, normalized terms, term IDs, token indexes, SHA-256 fingerprints,
token counts, versions, and agreement state.

Report contract `gemini-migration-report-v1.1` requires contract and manifest versions,
Git revision, policy/dataset/context versions, separate timestamps, exact duration,
integrity/admissibility, safety configuration, budgets/totals, and traceability.
Integrity precedence is configuration, dataset, model contract, report contract,
harness, provider failure, budget stop, other inconclusive state, then valid.

## Budget-constrained integrated availability gate

The availability gate is dataset case 1, not a separate smoke execution. It
performs both stages for baseline and candidate and verifies transport, response
receipt, JSON parsing, schema and application validation, evidence integrity,
fallback isolation, canonical detector agreement, policy execution, and
invariants. Its four requests remain the first evaluation result.

Only after the gate passes may cases 2–15 execute. Request accounting is 4 gate
requests plus 56 continuation requests, with zero duplicate smoke requests, for
exactly 60 planned requests. A shared attempt counter refuses request 61;
retries consume the same ceiling.
