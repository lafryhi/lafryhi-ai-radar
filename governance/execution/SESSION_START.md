# SESSION_START

## Purpose

This document defines the mandatory initialization procedure that must be completed before any implementation work begins.

## Startup procedure

Complete these steps in order for every new Codex session:

1. Read [EXECUTION_MANUAL.md](EXECUTION_MANUAL.md).
2. Read [PROJECT_STATE.md](PROJECT_STATE.md).
3. Read the living handoff in [`NEXT_TASK_PACKAGE.md`](../continuity/NEXT_TASK_PACKAGE.md).
4. Consult [`PROJECT_MEMORY.md`](../continuity/PROJECT_MEMORY.md) when the requested work depends on durable engineering knowledge.
5. Verify that the current Git branch matches the expected working branch.
6. Verify that the current `HEAD` commit matches the commit expected by `PROJECT_STATE.md` and the handoff package.
7. Verify that the Git worktree is clean.
8. Verify that the frozen production tag has not moved.
9. Read [PHASE_ROADMAP.md](PHASE_ROADMAP.md).
10. Determine the active milestone and requested phase.
11. Read only the governance documents required for that phase.
12. Verify the requested phase's entry criteria.
13. Execute only the requested phase.
14. Do not begin a later phase unless explicitly authorized.
15. Run every required gate in [QUALITY_GATES.md](QUALITY_GATES.md) and the applicable items in [PHASE_CHECKLISTS.md](PHASE_CHECKLISTS.md).
16. Update [PROJECT_STATE.md](PROJECT_STATE.md) and complete the continuity handoff required by [`CONTINUITY_ENGINE.md`](../continuity/CONTINUITY_ENGINE.md).
17. Produce the implementation report required by [EXECUTION_MANUAL.md](EXECUTION_MANUAL.md).
18. Create exactly one commit if and only if all acceptance criteria are satisfied.

## Mandatory safety rules

Before implementation, verify that:

- no deployment is requested;
- no push is requested;
- no merge is requested;
- no production tag modification is requested;
- no production feature is enabled; and
- no governance document is bypassed.

Apply all permanent constraints in [SAFETY_RULES.md](SAFETY_RULES.md).

If any prerequisite fails:

- stop immediately;
- report the reason; and
- do not continue.
