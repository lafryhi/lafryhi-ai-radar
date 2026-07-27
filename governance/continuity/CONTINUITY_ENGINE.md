# Development Continuity Engine

## Purpose

Maintain uninterrupted LAFRYHI AI Radar evolution across independent Codex CLI sessions. Preserve durable knowledge, make every completed phase traceable and reproducible, and prepare only the immediate authorized task without depending on long chat history.

## Principles

- **Continuity:** leave the repository ready for a fresh session.
- **Knowledge preservation:** retain durable facts outside transient prompts.
- **Maintainability:** keep state concise and move lasting lessons into stable records.
- **Scalability:** use the same handoff process for every phase and sub-phase.
- **Traceability:** connect decisions, outcomes, evidence, commits, and next steps.
- **Reproducibility:** record inputs, commands, versions, results, and limitations.
- **Long-term evolution:** preserve history without rewriting prior evidence.
- **Minimal prompt dependency:** make repository documents sufficient to resume work.

## Continuity architecture

- [`SESSION_START.md`](../execution/SESSION_START.md) controls session initialization and prerequisite checks.
- This document controls successful phase completion and handoff.
- [`PROJECT_STATE.md`](../execution/PROJECT_STATE.md) is the concise current-state authority.
- [`PROJECT_MEMORY.md`](PROJECT_MEMORY.md) preserves durable engineering knowledge, not session notes.
- [`EVOLUTION_HISTORY.md`](EVOLUTION_HISTORY.md) preserves chronological, commit-linked outcomes.
- [`NEXT_TASK_POLICY.md`](NEXT_TASK_POLICY.md) governs handoff generation.
- [`NEXT_TASK_PACKAGE.md`](NEXT_TASK_PACKAGE.md) contains only the immediate executable task, or an explicit no-authorization state.

## Lifecycle

```text
Session Start
→ Governance Discovery
→ Entry Verification
→ Implementation
→ Validation
→ Documentation
→ PROJECT_STATE Update
→ PROJECT_MEMORY Update
→ EVOLUTION_HISTORY Update
→ NEXT_TASK_PACKAGE Generation
→ Ready for Next Session
```

Apply the execution workflow and gates in [`EXECUTION_MANUAL.md`](../execution/EXECUTION_MANUAL.md). After all acceptance criteria pass:

1. Update `PROJECT_STATE.md` with the completed scope, starting baseline, gate result, validation, limitations, and active milestone.
2. Update `PROJECT_MEMORY.md` only when work establishes a durable lesson, decision, discovery, limitation, debt item, constraint, performance fact, security/privacy lesson, or opportunity.
3. Append one verified entry to `EVOLUTION_HISTORY.md`; never revise history to hide a failure or limitation.
4. Regenerate `NEXT_TASK_PACKAGE.md` under `NEXT_TASK_POLICY.md`.
5. Verify the proposed next task against authoritative entry criteria. If authorization is absent, record that state and do not invent work.
6. Audit links, state consistency, validation evidence, and the fresh-session prompt before committing.

The phase is not handoff-complete until these continuity records are current. Commit, push, merge, deployment, production action, and tag authority remain separate.
