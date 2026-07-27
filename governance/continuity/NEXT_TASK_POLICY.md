# Next Task Policy

## Mandatory update

After every phase or sub-phase that satisfies all acceptance criteria, update [`NEXT_TASK_PACKAGE.md`](NEXT_TASK_PACKAGE.md) before the completion commit. If the current work fails or is incomplete, retain or replace the package with an explicit blocked/not-authorized state; never imply successful handoff.

## Required package content

Record:

- current branch and state baseline commit;
- frozen production tag and commit;
- current milestone;
- completed and remaining phases;
- immediate next phase only;
- entry and exit criteria;
- required governance documents;
- expected deliverables;
- required validations and applicable performance requirements;
- required documentation updates;
- acceptance criteria and known risks;
- explicit Do Not constraints;
- expected commit message and completion classification; and
- a ready-to-run Codex CLI prompt.

Reference authoritative repository documents instead of copying large governance sections.

## Authorization rules

- Generate a task for no more than one future phase or bounded sub-phase.
- Authorize nothing merely because it appears next in a roadmap.
- Verify entry criteria, accepted scope, dependencies, decisions, and user authority before marking a task ready.
- Never invent a phase name, requirement, approval, reviewer, threshold, deliverable, or commit message.
- Never broaden an accepted slice to resolve unrelated remaining work.
- If prerequisites are incomplete or no next phase is authorized, say so clearly. List the evidence needed for authorization and make the prompt stop after verification.
- Do not use the package to authorize deployment, push, merge, tag movement, production changes, or a later phase.

## Package status

Use exactly one:

- `READY`: the named immediate phase has explicit authority and every entry criterion passes.
- `BLOCKED`: a named phase exists but one or more mandatory entry criteria fail.
- `NOT_AUTHORIZED`: governance does not authorize a bounded immediate phase.
- `COMPLETE`: no further planned phase remains.

## Ready-to-run prompt

Enclose the prompt exactly between:

```text
----- BEGIN NEXT TASK -----
...
----- END NEXT TASK -----
```

The prompt must require the fresh session to read the startup procedure, execution manual, project state, and next-task package; execute only the authorized immediate phase; apply all gates; update continuity records; and stop when authorization or prerequisites are absent.
