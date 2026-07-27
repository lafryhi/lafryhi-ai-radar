# NEXT_TASK_PACKAGE

## Package Status

`NOT_AUTHORIZED`

No authoritative document defines or authorizes a Phase 5.1C slice. The phrase “Phase 5.1C” appears only as an example in [`PROMPT_MINIMIZATION_GUIDE.md`](../execution/PROMPT_MINIMIZATION_GUIDE.md), which grants no implementation authority. Do not execute it until an approved bounded scope and entry decision exist.

## Project Snapshot

| Field | Value |
|---|---|
| Branch | `phase-5/source-intelligence-foundation` |
| State baseline commit | `5e71d93a1214aa9293a62a3b2b2ecb4aeb48f1b8` |
| Frozen production tag | `v1.0.0-rc1` |
| Frozen production commit | `1ea50f5f01a8cd08481578cadc85ffff08eecf26` |
| Current milestone | Phase 5.1 — Source Intelligence |
| Production authorization | None for Phase 5 |

The resulting continuity-engine commit must be verified from Git at the next session because a commit cannot embed its own hash.

## Current Progress

- Frozen Phase 4 production baseline: complete.
- Phase 5 architecture, governance, and entry evidence: adopted/resolved for the authorized offline scope.
- Phase 5.1A: complete.
- Phase 5.1B: complete with non-blocking limitations; development qualification only.
- Full Phase 5.1 milestone qualification: pending.
- Remaining planned milestones: Phase 5.1 completion, then Phases 5.2 through 5.5 subject to separate authorization.

## Immediate Next Phase

None authorized.

The next candidate work is a newly approved bounded offline Phase 5.1 completion slice addressing governed corpus/manifest requirements. Governance must name and authorize that slice before implementation. Phase 5.2 remains unauthorized.

## Entry Criteria

Before a next package can become `READY`:

- approve a bounded slice and its explicit name;
- map it to the remaining Phase 5.1 scope and implementation-order steps;
- identify approved corpus inputs, licensing, privacy, provenance, annotation, checksum, and partition evidence;
- preserve module isolation and all Phase 4 compatibility constraints;
- resolve required ownership/review or record an accepted exception;
- define applicable thresholds, measurement environment, rollback, deliverables, and commit message; and
- obtain explicit user implementation authority.

## Required Governance Documents

Consult, at minimum:

- [`SESSION_START.md`](../execution/SESSION_START.md)
- [`EXECUTION_MANUAL.md`](../execution/EXECUTION_MANUAL.md)
- [`PROJECT_STATE.md`](../execution/PROJECT_STATE.md)
- [`PHASE_5_BLUEPRINT_INDEX.md`](../../PHASE_5_BLUEPRINT_INDEX.md)
- [`PHASE_5_MILESTONE_5_1_SCOPE.md`](../../PHASE_5_MILESTONE_5_1_SCOPE.md)
- [`PHASE_5_IMPLEMENTATION_ORDER.md`](../../PHASE_5_IMPLEMENTATION_ORDER.md)
- [`PHASE_5_ENTRY_GATE.md`](../../PHASE_5_ENTRY_GATE.md)
- [`PHASE_5_1_GATE_TIMING_MATRIX.md`](../../PHASE_5_1_GATE_TIMING_MATRIX.md)
- [`PHASE_5_ACCEPTANCE_THRESHOLDS.md`](../../PHASE_5_ACCEPTANCE_THRESHOLDS.md)
- [`PHASE_5_EVALUATION_CORPUS_GOVERNANCE.md`](../../PHASE_5_EVALUATION_CORPUS_GOVERNANCE.md)
- [`PHASE_5_INITIAL_CORPUS_COMPOSITION.md`](../../PHASE_5_INITIAL_CORPUS_COMPOSITION.md)
- [`PHASE_5_LANGUAGE_COHORT_POLICY.md`](../../PHASE_5_LANGUAGE_COHORT_POLICY.md)
- [`PHASE_5_1B_IMPLEMENTATION_REPORT.md`](../../PHASE_5_1B_IMPLEMENTATION_REPORT.md)

## Implementation Goals

No implementation goal is authorized. First establish and record the bounded next-slice authority without changing production or completed Phase 5 implementation.

## Expected Deliverables

Not defined until the bounded slice is approved. Do not infer deliverables from the list of remaining milestone requirements.

## Validation Gates

Any later authorized slice must run focused tests plus the complete test, lint, typecheck, and production-build suite; compatibility, privacy, isolation, corpus, determinism, and documentation gates apply according to scope.

## Performance Checks

Do not claim completion performance yet. Existing governance requires corpus-run latency, CI/resource recalibration, reproducibility, and threshold evidence under [`PHASE_5_ENTRY_MEASUREMENT_POLICY.md`](../../PHASE_5_ENTRY_MEASUREMENT_POLICY.md).

## Documentation Updates

Any completed future slice must update its implementation evidence, [`PROJECT_STATE.md`](../execution/PROJECT_STATE.md), [`PROJECT_MEMORY.md`](PROJECT_MEMORY.md) when durable knowledge changes, [`EVOLUTION_HISTORY.md`](EVOLUTION_HISTORY.md), and this package.

## Acceptance Criteria

Current package acceptance is limited to accurate `NOT_AUTHORIZED` classification. Future implementation acceptance must come from an approved scope and the applicable Phase 5.1 thresholds; it cannot be created by this package.

## Known Risks

- Mistaking the prompt-guide example for authorization.
- Treating 41 synthetic fixtures as the complete governed corpus.
- Claiming language support before cohort qualification.
- Using unapproved, unlicensed, private, or untraceable corpus material.
- Fabricating independent review or silently waiving it.
- Conflating development qualification with milestone or production qualification.

## Do Not

- Do not implement “Phase 5.1C” without new accepted scope and authority.
- Do not begin Phase 5.2.
- Do not modify Phase 4 or completed Phase 5.1A/5.1B behavior.
- Do not deploy, push, merge, move tags, enable production features, or touch production data.
- Do not invent corpus evidence, reviewers, thresholds, requirements, or acceptance.

## Expected Commit

Not defined. The authorizing request must provide or approve the bounded slice's commit message.

## Expected Completion Classification

`NOT_AUTHORIZED` until a bounded next slice passes entry verification.

## Ready-to-run Codex CLI Prompt

----- BEGIN NEXT TASK -----

Read governance/execution/SESSION_START.md.
Read governance/execution/EXECUTION_MANUAL.md.
Resume from governance/execution/PROJECT_STATE.md.
Read governance/continuity/NEXT_TASK_PACKAGE.md.
Verify whether repository governance and the current user request now authorize one immediate bounded Phase 5.1 completion slice.
If authorization or any entry criterion is absent, stop and report the exact blocker.
Execute only the authorized immediate phase. Do not begin a later phase.

----- END NEXT TASK -----
