# SESSION_START

## Purpose

This document defines the mandatory initialization procedure that must be completed before any implementation work begins.

## Startup procedure

Complete these steps in order for every new Codex session:

1. Read [EXECUTION_MANUAL.md](EXECUTION_MANUAL.md).
2. Read [PROJECT_STATE.md](PROJECT_STATE.md).
3. Verify that the current Git branch matches the expected working branch.
4. Verify that the current `HEAD` commit matches the commit expected by `PROJECT_STATE.md`.
5. Verify that the Git worktree is clean.
6. Verify that the frozen production tag has not moved.
7. Read [PHASE_ROADMAP.md](PHASE_ROADMAP.md).
8. Determine the active milestone and requested phase.
9. Read only the governance documents required for that phase.
10. Verify the requested phase's entry criteria.
11. Execute only the requested phase.
12. Do not begin a later phase unless explicitly authorized.
13. Run every required gate in [QUALITY_GATES.md](QUALITY_GATES.md) and the applicable items in [PHASE_CHECKLISTS.md](PHASE_CHECKLISTS.md).
14. Update [PROJECT_STATE.md](PROJECT_STATE.md).
15. Produce the implementation report required by [EXECUTION_MANUAL.md](EXECUTION_MANUAL.md).
16. Create exactly one commit if and only if all acceptance criteria are satisfied.

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
