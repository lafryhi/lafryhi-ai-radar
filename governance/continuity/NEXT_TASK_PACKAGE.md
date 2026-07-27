# NEXT_TASK_PACKAGE

## Package Status

`READY`

The current user instruction and [`PHASE_5_1C_CORPUS_MANIFEST_TOOLING_SCOPE.md`](../../PHASE_5_1C_CORPUS_MANIFEST_TOOLING_SCOPE.md) authorize one immediate offline slice. Authorization covers tooling only.

## Project Snapshot

| Field | Value |
|---|---|
| Branch | `phase-5/source-intelligence-foundation` |
| State baseline commit | `fadac2e90b8f41d82eff683ed70583b3bfd2db27` |
| Frozen production tag | `v1.0.0-rc1` |
| Frozen production commit | `1ea50f5f01a8cd08481578cadc85ffff08eecf26` |
| Current milestone | Phase 5.1 — Source Intelligence |
| Production authorization | None for Phase 5 |

Verify the resulting authorization commit from Git at session start because a commit cannot embed its own hash.

## Current Progress

- Phase 4 production baseline is frozen.
- Phase 5 architecture, governance, and entry evidence are adopted.
- Phase 5.1A and 5.1B are complete within their recorded limitations.
- Phase 5.1C tooling is authorized and not started.
- Full Phase 5.1 qualification and Phases 5.2–5.5 remain pending and separately gated.

## Immediate Next Phase

Phase 5.1C — Governed Corpus Manifest Tooling.

Execute no other phase.

## Entry Criteria

At session start, verify:

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

Implement pure, versioned, deterministic contracts and tooling for corpus manifests, canonical serialization, SHA-256 integrity, governance metadata, partitions, family leakage, sealing, and composition accounting under the existing Phase 5 source-intelligence boundary.

## Expected Deliverables

- Manifest/corpus-control contracts and validators.
- Canonical serialization and integrity utilities.
- Partition, seal, family, composition, and governance-metadata validation.
- Privacy-safe bounded diagnostics.
- Synthetic tooling fixtures and focused tests only.
- `PHASE_5_1C_IMPLEMENTATION_REPORT.md`.
- Updated execution and continuity records.

## Validation Gates

Run focused Phase 5.1C and prior Phase 5.1 regression tests, the complete suite, lint, typecheck, production build, boundary/capability/privacy audits, deterministic repeat runs, golden vectors, negative integrity/partition/seal tests, Markdown validation, internal-link validation, and `git diff --check`.

## Performance Checks

Follow [`PHASE_5_ENTRY_MEASUREMENT_POLICY.md`](../../PHASE_5_ENTRY_MEASUREMENT_POLICY.md). Measure repeated tooling/manifest runs, report every attempt and median/min/max, enforce applicable local `THR-LAT-001` and `THR-COST-002` limits, report unavailable memory honestly, and do not manufacture p95 or CI claims.

## Documentation Updates

Create `PHASE_5_1C_IMPLEMENTATION_REPORT.md`; update [`PROJECT_STATE.md`](../execution/PROJECT_STATE.md), [`PROJECT_MEMORY.md`](PROJECT_MEMORY.md) when durable knowledge changes, [`EVOLUTION_HISTORY.md`](EVOLUTION_HISTORY.md), and this package.

## Acceptance Criteria

Meet every criterion in the Phase 5.1C scope, including byte-identical deterministic output, 100% seeded validator outcomes, zero seeded partition/seal escapes, zero prohibited diagnostics, zero regressions, preserved isolation, bounded artifacts/logs, and full validation.

Do not claim the 240/385 corpus, language cohorts, milestone review, or Phase 5.1 completion.

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

`feat: add governed Phase 5.1 corpus manifest tooling`

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
Read PHASE_5_1C_CORPUS_MANIFEST_TOOLING_SCOPE.md and its required governance.
Implement Phase 5.1C — Governed Corpus Manifest Tooling only.
Run every required validation and complete the execution/continuity handoff.
Do not collect the full corpus, close Phase 5.1, begin Phase 5.2, deploy, push, merge, or move tags.

----- END NEXT TASK -----
