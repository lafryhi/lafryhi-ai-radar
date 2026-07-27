# NEXT_TASK_PACKAGE

## Package Status

`NOT_AUTHORIZED`

Phase 5.1C tooling is complete. No authoritative document currently authorizes the next corpus-qualification or Phase 5.2 slice.

## Project Snapshot

| Field | Value |
|---|---|
| Branch | `phase-5/source-intelligence-foundation` |
| State baseline commit | `9540fd9840c9df1e416081c3fd54952bf6f6b817` |
| Frozen production tag | `v1.0.0-rc1` |
| Frozen production commit | `1ea50f5f01a8cd08481578cadc85ffff08eecf26` |
| Current milestone | Phase 5.1 — Source Intelligence |
| Production authorization | None for Phase 5 |

Verify the resulting implementation commit from Git at session start because a commit cannot embed its own hash.

## Current Progress

- Phase 4 production baseline is frozen.
- Phase 5 architecture, governance, and entry evidence are adopted.
- Phase 5.1A and 5.1B are complete within their recorded limitations.
- Phase 5.1C tooling is complete within its offline scope.
- Full Phase 5.1 qualification and Phases 5.2–5.5 remain pending and separately gated.

## Immediate Next Phase

None authorized.

The next candidate is a separately governed Phase 5.1 completion-qualification slice. Do not infer its authorization from the remaining corpus requirements or from Phase 5.1C completion.

## Entry Criteria

Before any future package becomes `READY`, verify:

- the branch and authorization commit match the handoff;
- the worktree is clean and `v1.0.0-rc1` remains at `1ea50f5…`;
- the Phase 5.1 entry gate remains `READY_WITH_NON_BLOCKING_LIMITATIONS`;
- Phase 5.1A/5.1B and full baseline validations pass;
- the accepted offline ADRs, composition, language policy, compatibility, privacy, and isolation boundaries are unchanged; and
- no production, external-data, reviewer, or later-phase authority is inferred.

## Required Governance Documents

Read:

- [`SESSION_START.md`](../execution/SESSION_START.md)
- [`EXECUTION_MANUAL.md`](../execution/EXECUTION_MANUAL.md)
- [`PROJECT_STATE.md`](../execution/PROJECT_STATE.md)
- [`PHASE_5_1C_CORPUS_MANIFEST_TOOLING_SCOPE.md`](../../PHASE_5_1C_CORPUS_MANIFEST_TOOLING_SCOPE.md)
- [`PHASE_5_MILESTONE_5_1_SCOPE.md`](../../PHASE_5_MILESTONE_5_1_SCOPE.md)
- [`PHASE_5_EVALUATION_CORPUS_GOVERNANCE.md`](../../PHASE_5_EVALUATION_CORPUS_GOVERNANCE.md)
- [`PHASE_5_INITIAL_CORPUS_COMPOSITION.md`](../../PHASE_5_INITIAL_CORPUS_COMPOSITION.md)
- [`PHASE_5_LANGUAGE_COHORT_POLICY.md`](../../PHASE_5_LANGUAGE_COHORT_POLICY.md)
- [`PHASE_5_ACCEPTANCE_THRESHOLDS.md`](../../PHASE_5_ACCEPTANCE_THRESHOLDS.md)
- [`PHASE_5_ENTRY_MEASUREMENT_POLICY.md`](../../PHASE_5_ENTRY_MEASUREMENT_POLICY.md)
- [`PHASE_5_1_GATE_TIMING_MATRIX.md`](../../PHASE_5_1_GATE_TIMING_MATRIX.md)
- [`PHASE_5_ADR_ACCEPTANCE_RECORD.md`](../../PHASE_5_ADR_ACCEPTANCE_RECORD.md)
- [`PHASE_5_OWNERSHIP_MATRIX.md`](../../PHASE_5_OWNERSHIP_MATRIX.md)
- [`PHASE_5_1B_IMPLEMENTATION_REPORT.md`](../../PHASE_5_1B_IMPLEMENTATION_REPORT.md)

## Implementation Goals

No implementation goal is authorized. Define and approve one bounded completion-qualification slice before implementation.

## Expected Deliverables

Not defined until the next bounded slice is authorized.

## Validation Gates

Any later authorized slice must run the complete project suite and its corpus, measurement, privacy, review, and milestone-specific gates.

## Performance Checks

No next-slice performance claim is authorized. Continue following [`PHASE_5_ENTRY_MEASUREMENT_POLICY.md`](../../PHASE_5_ENTRY_MEASUREMENT_POLICY.md) when a completion-qualification slice is approved.

## Documentation Updates

The next authorized slice must update its implementation report, [`PROJECT_STATE.md`](../execution/PROJECT_STATE.md), [`PROJECT_MEMORY.md`](PROJECT_MEMORY.md) when durable knowledge changes, [`EVOLUTION_HISTORY.md`](EVOLUTION_HISTORY.md), and this package.

## Acceptance Criteria

Phase 5.1C met its slice criteria, but no future acceptance criteria are authorized here. Do not claim the 240/385 corpus, language cohorts, milestone review, or Phase 5.1 completion.

## Known Risks

- Canonical serialization drift across runtimes.
- Ambiguous byte/newline/checksum boundaries.
- Cross-partition leakage through related families.
- Treating seal metadata as content authorization.
- Leaking fixture content through diagnostics or hashes.
- Confusing composition-accounting capability with corpus completion.
- Scope creep into corpus collection, language detection, or Phase 5.2.

## Do Not

- Do not collect or release the full corpus.
- Do not claim any real cohort, partition, reviewer, threshold, or milestone completion.
- Do not modify Phase 4 or completed Phase 5.1A/5.1B behavior.
- Do not add production dependencies, reads/writes, routes, flags, telemetry transports, model calls, UI, approval, or publication behavior.
- Do not begin Phase 5.2.
- Do not deploy, push, merge, move tags, or change production.

## Expected Commit

Not defined until the next bounded slice is approved.

## Expected Completion Classification

- Slice: `PHASE_5_1C_TOOLING_COMPLETE`
- Milestone: `PHASE_5_1_QUALIFICATION_PENDING`
- Production authorization: None

## Ready-to-run Codex CLI Prompt

----- BEGIN NEXT TASK -----

Read governance/execution/SESSION_START.md.
Read governance/execution/EXECUTION_MANUAL.md.
Resume from governance/execution/PROJECT_STATE.md.
Read governance/continuity/NEXT_TASK_PACKAGE.md.
Verify whether a newly accepted bounded Phase 5.1 completion-qualification scope exists.
If no such authorization exists, stop and report that the next task is not authorized.
Do not begin Phase 5.2, collect or qualify the corpus, deploy, push, merge, or move tags.

----- END NEXT TASK -----
