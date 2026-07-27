# Reusable Phase Checklists

Use every applicable item. A checked box means evidence exists, not merely that an action was attempted.

## Authority and repository safety

- [ ] Read `EXECUTION_MANUAL.md` and `PROJECT_STATE.md`.
- [ ] Read all controlling phase governance and accepted ADRs.
- [ ] Confirm phase authorization, entry criteria, scope, exclusions, and rollback.
- [ ] Record branch, `HEAD`, frozen tags, recent history, and worktree status.
- [ ] Identify and preserve pre-existing/user changes.
- [ ] Confirm no production, deployment, push, migration, traffic, IAM, secret, or tag action is implied.
- [ ] Restrict changes to the smallest authorized slice.
- [ ] Confirm frozen Phase 4 behavior and compatibility contracts remain intact.

## Implementation

- [ ] Map each requirement to code, test, evidence, or documentation.
- [ ] Keep offline, advisory, shadow, and production layers explicitly separated.
- [ ] Preserve deterministic identities, bounded behavior, human approval, privacy, and provenance.
- [ ] Avoid unrelated refactors, dependency churn, generated artifacts, and hidden state changes.
- [ ] Implement rollback or isolation controls required by the phase.

## Documentation

- [ ] Reference existing governance instead of copying or rewriting it.
- [ ] Record exact scope, commands, results, versions, measurements, and limitations.
- [ ] Distinguish proposed, accepted, implemented, qualified, deployed, and verified claims.
- [ ] Preserve historical evidence; add a new assessment when classification changes.
- [ ] Update `PROJECT_STATE.md` after phase completion.
- [ ] Keep links and document indexes valid.

## Validation and testing

- [ ] Run focused tests for changed behavior.
- [ ] Add positive, negative, boundary, determinism, failure, privacy, and regression cases as applicable.
- [ ] Confirm tests assert governed behavior rather than implementation trivia.
- [ ] Run the complete test suite.
- [ ] Run lint.
- [ ] Run type checking.
- [ ] Run the production build.
- [ ] Run any additional phase-specific corpus, compatibility, security, or integration checks.
- [ ] Record pre-existing failures separately; never conceal them.
- [ ] Do not delete, skip, loosen, quarantine, or rewrite a test merely to obtain green status.

## Performance and measurement

- [ ] Identify applicable latency, resource, cost, throughput, and capacity thresholds.
- [ ] Follow [`PHASE_5_ENTRY_MEASUREMENT_POLICY.md`](../../PHASE_5_ENTRY_MEASUREMENT_POLICY.md) or the phase-specific measurement policy.
- [ ] Use representative, approved, versioned inputs and a recorded environment.
- [ ] Report sample count and appropriate statistics; do not claim percentiles from inadequate samples.
- [ ] Compare with the frozen or accepted baseline.
- [ ] Treat threshold regressions as failures unless governance explicitly accepts and records them.

## Audit and quality gate

- [ ] Review the complete diff and changed-file list.
- [ ] Check imports, persistence, network, runtime, telemetry, and production boundaries.
- [ ] Check for secrets, source bodies, prompts, raw model output, credentials, or forbidden telemetry.
- [ ] Verify no acceptance threshold or reviewer requirement changed silently.
- [ ] Apply PASS/FAIL and milestone qualification rules from `QUALITY_GATES.md`.
- [ ] Record residual uncertainty without converting it into success.

## Commit and handoff

- [ ] Stage only authorized files.
- [ ] Inspect the staged diff.
- [ ] Use the exact requested commit message, or one repository-conforming commit if none is specified.
- [ ] Create no extra commits unless explicitly requested.
- [ ] Do not amend unrelated history.
- [ ] Do not push, deploy, or move tags.
- [ ] Report result, files, references, validation, commit hash, branch, worktree, and limitations.
