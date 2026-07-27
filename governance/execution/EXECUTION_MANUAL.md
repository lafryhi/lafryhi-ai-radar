# Permanent Execution Manual

## Authority

This manual is the primary authority for executing future repository phases. It defines the execution process, not product behavior. Product, architecture, safety, acceptance, and milestone-specific requirements remain authoritative in their existing documents.

When instructions conflict, apply this precedence:

1. explicit current user instruction;
2. repository safety and frozen-production constraints;
3. accepted milestone governance and architecture decisions;
4. this execution framework;
5. implementation reports and general project documentation.

Do not interpret a roadmap, proposed design, deferred ADR, or completed offline slice as implementation, production, deployment, or next-milestone authorization.

## Authoritative document discovery

Before implementation, Codex must:

1. Read this manual and [PROJECT_STATE.md](PROJECT_STATE.md).
2. Inspect the branch, `HEAD`, tags, worktree, recent history, repository instructions, and build/test manifests.
3. Read [SAFETY_RULES.md](SAFETY_RULES.md), [WORKFLOW_RULES.md](WORKFLOW_RULES.md), [QUALITY_GATES.md](QUALITY_GATES.md), and the relevant checklist in [PHASE_CHECKLISTS.md](PHASE_CHECKLISTS.md).
4. Follow [PHASE_ROADMAP.md](PHASE_ROADMAP.md) to identify the requested phase, dependencies, entry criteria, and deliverables.
5. Discover the phase-specific authority through the existing indexes and records. For Phase 5, begin with [`PHASE_5_BLUEPRINT_INDEX.md`](../../PHASE_5_BLUEPRINT_INDEX.md), then read the named scope, implementation order, accepted ADRs, contracts, thresholds, risks, and prior reports relevant to the requested slice.
6. For Phase 4 compatibility or production invariants, read the relevant `GEMINI_XPRIZE_PHASE4_*.md` records, [`PHASE_4_2_1_EVIDENCE_HARDENING.md`](../../PHASE_4_2_1_EVIDENCE_HARDENING.md), [`RELEASE_NOTES_v1.0_RC1.md`](../../RELEASE_NOTES_v1.0_RC1.md), and [`OPERATIONS_RUNBOOK.md`](../../OPERATIONS_RUNBOOK.md).
7. Search for newer accepted records that supersede older statements. Preserve historical reports; do not rewrite them to make the present look consistent.
8. State the exact authorized scope and exclusions before changing files.

Reading only this framework is insufficient when phase-specific governance exists.

## Phase execution protocol

Every phase or sub-phase must be handled as a bounded unit:

1. **Establish authority.** Identify the requested phase, controlling documents, accepted decisions, explicit authorization, frozen baseline, and prohibited actions.
2. **Verify entry.** Prove every dependency and entry criterion. Classify missing evidence honestly; do not convert a limitation into a pass.
3. **Baseline the repository.** Record branch, commit, tag relationship, worktree state, validation baseline, and any pre-existing failures or user changes.
4. **Plan the smallest compliant slice.** Map requirements to files, tests, evidence, rollback, and documentation. Avoid unrelated cleanup.
5. **Implement within scope.** Preserve Phase 4 compatibility and all accepted Phase 5 boundaries. Keep offline/advisory work isolated unless production integration is explicitly authorized.
6. **Validate proportionately.** Run focused tests during development, then the full required validation suite. Apply the governed measurement policy where thresholds or performance claims are involved.
7. **Audit.** Review the diff for scope, safety, privacy, compatibility, regressions, test integrity, generated artifacts, and accidental production changes.
8. **Document evidence.** Add or update only the records authorized by the phase. State commands, results, limitations, and remaining work precisely.
9. **Qualify the gate.** Use [QUALITY_GATES.md](QUALITY_GATES.md) and milestone-specific thresholds. A sub-slice pass is not a milestone pass.
10. **Commit once authorized.** Commit only the intended files with the requested or repository-conforming message. Never push or deploy unless separately and explicitly authorized.
11. **Update state.** After a completed phase, update [PROJECT_STATE.md](PROJECT_STATE.md) in the same phase commit when practical. Record the completed scope, baseline commit, branch, milestone, next authorized work, limitations, and validation.
12. **Report.** Return PASS/FAIL, scope completed, files changed, documents consulted, validation evidence, commit, branch, worktree status, limitations, and next gate.

## Scope control

- “Implement Phase X.Y only” authorizes only that bounded phase and its normal tests and documentation.
- It does not authorize the next phase, deployment, traffic, cloud mutations, data migration, production writes, pushing, or tag changes.
- If authority is absent or entry criteria fail, stop before implementation and report the exact blocker.
- If governance is ambiguous, choose the narrower safe interpretation and request direction where the choice materially changes the result.
- Existing user changes must be preserved. Do not hide, overwrite, or include unrelated work in a phase commit.

## Completion

A phase is complete only when its exit criteria and all applicable acceptance gates pass, its evidence is recorded, its limitations are explicit, and the repository is in the required final state. “Implemented,” “development-qualified,” “shadow-qualified,” “production-ready,” and “deployed” are distinct claims and must never be substituted for one another.
