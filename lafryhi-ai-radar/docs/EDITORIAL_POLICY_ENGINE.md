# Editorial Policy Engine

## Architecture

The editorial flow is:

`Signal Intelligence → Decision Intelligence → Editorial Policy Engine → Human Review`

The policy engine is a deterministic domain layer. It does not call a model, inspect a
model/provider name, persist data, publish content, or replace the reviewer. It consumes
validated intelligence plus explicit editorial context and returns a separate effective
position while preserving the model's original position.

The current authoritative constitution is
[`config/editorial-policy.v1.1.json`](../config/editorial-policy.v1.1.json). Version 1
remains historical calibration evidence. The strict Zod
contract is in `src/domain/editorial-policy.ts`; evaluation is implemented by
`src/services/editorial-policy-engine.ts`.

## Rules and precedence

Rules execute in ascending priority:

1. EP-007 — invalid use of insufficient evidence
2. EP-006 — forbidden language
3. EP-003 — conflicting sources
4. EP-004 — pending verification
5. EP-001 — ACT_NOW threshold
6. EP-005 — numerical/date escalation
7. EP-002 — promotional or low-impact content
8. EP-008 — human-review precedence

Every triggered reason is retained. Final action restrictiveness is:

`ALLOW < DOWNGRADE < REQUIRE_HUMAN_REVIEW < BLOCK`

A later rule cannot upgrade a supported decision. Conflict and pending rules may replace
`INSUFFICIENT_EVIDENCE` with a reviewable `DEFER` or `MONITOR` position because that status
must not erase known uncertainty.

## Explainability and privacy

Results contain the policy version, original and effective positions, action, rule IDs,
human-readable reasons, affected fields, evidence IDs, severity, review requirement,
normalized forbidden terms, and a sanitized audit timestamp/item ID. They never contain
source bodies, prompts, credentials, access tokens, or model metadata.

The original model result is immutable. Reports distinguish:

- raw model recommendation;
- policy-adjusted effective position;
- eventual human decision.

## Evaluation metrics

Migration reports retain all raw reliability and quality metrics and additionally report:

- raw status and recommendation agreement;
- policy-adjusted recommendation agreement;
- override, downgrade, block, and human-review rates;
- forbidden-term detection;
- over-escalation correction;
- excessive-conservatism correction;
- out-of-policy recommendation correction.

Policy adjustment never converts a raw-model failure into a raw success.

## Version 1.1 calibration

EP-007 now separates evidence sufficiency from editorial acceptability. It activates
only when `evidenceState=SUFFICIENT` and the explicit uncertainty state is source
conflict, pending verification, editorial defer, policy uncertainty, or
human-review-only uncertainty. Promotion, rejection, or low impact alone never
converts valid `INSUFFICIENT_EVIDENCE`.

EP-001 recognizes strong `ACT_NOW` only when structured context confirms sufficient
evidence, authoritative or trusted sourcing, high material impact, qualified
confidence, an allowed `ACT_NOW` position, and no conflict, pending verification, or
promotional framing. This is semantic and language-independent. Numerical/date cases
remain subject to EP-005 and require explicit numerical-claim verification.

`normalApplicationReviewRequired` is always true. It represents the application’s
existing human-review boundary. `additionalPolicyReviewRequired` represents a material
policy finding; an `ALLOW` result does not publish and does not bypass normal review.

Evaluation reports distinguish:

- effective-position override, downgrade, and upgrade rates;
- the policy action’s `DOWNGRADE` rate;
- additional policy-review rate;
- normal application-review rate;
- block rate and pending-path conversion rate.

The older `policyOverrideRate`, `policyDowngradeRate`, `policyHumanReviewRate`, and
`policyBlockRate` fields are compatibility aliases; new consumers should use the
unambiguous names.

The saved migration dataset has a separate, validated semantic context fixture at
`eval/datasets/gemini-migration.editorial-context.json`. It exists only for evaluation
and contains no production case-name rules. Unknown future cases must supply equivalent
structured context rather than relying on wording or language.

## Safely adding or changing a rule

1. Add a versioned constitution instead of editing historical policy evidence.
2. Add a unique `EP-NNN` ID, unique priority, supported action, and reason template.
3. Extend the strict schema and deterministic engine.
4. Add positive, negative, interaction, privacy, and no-upgrade tests.
5. Replay saved evaluation reports locally.
6. Require human approval before connecting the new version to production.

Rollback means selecting the previous reviewed constitution and replaying the same fixture.
It does not alter model output or historical reports.

## Policy-only replay

Replay uses sanitized fields from a saved evaluation report and the versioned dataset. It
makes zero model calls and writes no data:

```powershell
npm.cmd run eval:policy:replay -- eval/results/<saved-evaluation>.json
```

For reports created before Phase 3, forbidden-term findings are recovered from the saved
deterministic expectation result and configured term list; raw response text remains redacted.

## Canonical forbidden-term adjudication

EP-006 no longer owns an independent matcher. The constitution remains authoritative
for `forbiddenTerms` and `forbiddenTermSettings`. The canonical detector normalizes
Unicode, case, configured accents, apostrophes, dashes, punctuation, and whitespace,
then performs token-boundary phrase matching across multilingual text.

Evaluation computes the detector once over `modelOutput` before redaction and passes
that exact adjudication to EP-006. Duplicate normalized terms, empty or overlapping
definitions, unsupported boundary/locale settings, and conflicting alternatives fail
validation.
