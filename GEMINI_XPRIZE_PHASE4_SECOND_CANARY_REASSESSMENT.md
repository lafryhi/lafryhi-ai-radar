# Phase 4 Second Canary — Revised Verification Assessment

**Assessment scope:** commit
`0f271d5dd8f1aa63b93d48678330742938fe85f1`  
**Execution record:** the original second-canary report is preserved unchanged
as the historical record. This document changes only its verification
classification under the revised Phase 4 protocol.  
**Revised overall gate:** `PASS_WITH_VERIFICATION_LIMITATION`

## Requirement-level assessment

| Requirement | Status | Evidence | Residual uncertainty | Material risk |
|---|---|---|---|---|
| Immutable production build | PASS | Cloud Build `e9c8f724-9a72-4792-97b3-b608d1fb1fb8`; image digest `sha256:f474ae825989908e7412a073af865ed59277ea272b65102f0a2469e5c37d17b5` | None | No |
| Revision readiness before traffic | PASS | `Ready=True`, `ConfigurationsReady=True`, and `RoutesReady=True` before canary traffic | None | No |
| Health endpoint | PASS | Authenticated health request returned `ok` | None | No |
| Authenticated operator route | PASS | Operator route returned HTTP 200 using the existing authentication configuration | None | No |
| Deployment error logs | PASS | No deployment-related severity `ERROR` entries | Normal log-ingestion delay was allowed before the final query | No |
| Exactly one new trusted source | PASS | One registered, previously unprocessed source created source `7d304249-c60d-4b65-b0f6-9ebe7a3a2af4`; no second source was attempted | None | No |
| Prompt version | PASS | Processing run stored `radar-decision-intelligence-v3` | None | No |
| Gemini call and recovery ceilings | PASS | Initial call succeeded; `retryCount=0`, regeneration count 0, no recovery events; configured ceilings remained four calls and one regeneration | Call count is derived from the run state and absence of retry/regeneration events rather than a separate provider-call counter | No |
| Evidence integrity | PASS | Validation outcome was `passed`; no mismatch diagnostic or `quote_not_in_source` occurred; strict NFC-plus-whitespace validator remained deployed | This source did not exercise a failing quote correction | No |
| Sensitive-log exclusion | PASS | No raw output, source/quote text, prompt body, credentials, secrets, mismatch characters, or forbidden structured fields were detected | Bounded sampling supplements schema/key inspection; logs intentionally do not retain model output | No |
| Deterministic analysis identity | PASS | `analysis-4868af19-4aa5-4f50-aed0-0297784dd92f` | None | No |
| Deterministic review identity | PASS | `review-analysis-4868af19-4aa5-4f50-aed0-0297784dd92f` | None | No |
| Atomic readiness finalization | PASS | Telemetry recorded `finalization_started` then `finalization_committed`, attempt 1, zero persistence retries; analysis, pending review, and `pending_review` run state were observed with exact linkage | Firestore exposes committed state, not intermediate transaction visibility, which is expected | No |
| No orphan analysis or review | PASS | Global orphan-analysis count 0 and orphan-review count 0 | None | No |
| No duplicate analysis or review | PASS | One analysis for the run, one review for the analysis, and zero duplicate identity groups | None | No |
| Direct replay of completed analysis finalization | NOT_EXECUTABLE_BY_DESIGN | The operation is internal and has no production endpoint, operator action, or supported invocation surface. Unit and integration tests cover repeated finalization. Production showed deterministic IDs, exact linked state, one analysis, one review, no duplicates, no orphans, and a committed atomic transaction. Downstream approval replay returned idempotently with the same published item. | The exact internal return value was not directly observed in production on a second finalization invocation | No |
| No automatic approval or publication | PASS | Review remained pending and published count was unchanged until the explicit operator approval | None | No |
| Operator queue visibility | PASS | Authenticated pending queue rendered and contained the canary analysis | None | No |
| Explicit human approval | PASS | Exactly one state transition was performed through the existing protected review workflow; review became approved | None | No |
| Atomic publication behavior | PASS | Exactly one deterministic Radar item, `radar-analysis-4868af19-4aa5-4f50-aed0-0297784dd92f`, was created | None | No |
| Publication idempotency | PASS | One replay of the same approval request returned `idempotent: true`, the same Radar item ID, and left published count unchanged | None | No |
| No duplicate publication | PASS | Canary publication count 1; global duplicate-publication groups 0 | None | No |
| Post-canary errors and rollback criteria | PASS | Severity `ERROR` count 0; no orphan, conflict, ceiling, sensitive-data, automatic-publication, duplicate-publication, or dashboard rollback criterion occurred | None | No |
| Final service state | PASS | Canary revision served 100%; both Phase 4 flags were true; stable flag-off revision remained available | None | No |
| Repository worktree | PASS | Worktree was clean after deployment verification | None | No |

## Executed production checks

The deployment, readiness probes, health and operator requests, one-source
pipeline execution, evidence validation, atomic finalization, Firestore
linkage and duplicate checks, queue visibility, explicit approval, atomic
publication, approval replay, log privacy inspection, error inspection,
traffic inspection, and flag inspection were executed. Every executed
requirement passed.

## Design-limited checks

### Directly repeat completed analysis finalization

- **Status:** `NOT_EXECUTABLE_BY_DESIGN`
- **Why unavailable:** finalization is an internal pipeline operation and is
  intentionally not exposed as a production endpoint or operator action.
- **Out-of-scope invocation required:** a code modification, temporary
  production endpoint, ad hoc runner, direct internal module execution, or
  direct database manipulation.
- **Direct non-production coverage:** Phase 4.3 unit and cross-adapter
  integration tests cover exact repeated finalization and conflicting
  deterministic identities.
- **Production structural evidence:** deterministic run/analysis/review
  identities, exact linkage, one analysis, one review, committed transaction,
  zero persistence retries, zero duplicates, and zero orphans.
- **Downstream evidence:** explicit approval created one deterministic
  publication; replaying approval returned the same publication idempotently.
- **Remaining uncertainty:** the second internal finalization method's return
  value was not observed in production.
- **Material operational risk:** no. Creating a production replay interface
  solely for verification would increase attack surface and operational risk.

## Not-run checks

None.

## Blocked checks

None.

## Actual failures

None.

## Classification distinctions

- **Implementation failure:** an executed requirement produces an incorrect
  result or violates an invariant. None occurred.
- **Environment or dependency blockage:** an external outage, permission
  failure, or missing prerequisite prevents an otherwise supported check.
  None occurred.
- **Operator-skipped verification:** an available supported test is not
  executed. None occurred.
- **Intentional production inaccessibility:** an internal behavior has no
  supported production invocation surface and would require an unsafe or
  out-of-scope mechanism. The completed-finalization replay is the sole such
  requirement.

The historical `FAIL` label represented a classification error, not an
implementation failure. Under the revised protocol, the correct overall gate
is `PASS_WITH_VERIFICATION_LIMITATION`.
