# Prompt Minimization Guide

Future work should be requested by pointing Codex to repository-resident authority instead of restating governance in chat.

## Minimal phase prompt

```text
Read governance/execution/EXECUTION_MANUAL.md.
Resume from governance/execution/PROJECT_STATE.md.
Implement Phase X.Y only.
```

This is sufficient when the repository already contains an approved, unambiguous scope and the phase has entry authority. Codex must discover the controlling documents, verify the repository, apply all gates, update project state, validate, and report under the manual.

## Add only necessary intent

Include extra text only for information the repository cannot supply, such as:

- the exact sub-slice when several are authorized;
- a new business decision or changed priority;
- whether a commit is wanted and its required message;
- an explicit restriction narrower than existing governance; or
- separate authorization for an external action.

Example:

```text
Read governance/execution/EXECUTION_MANUAL.md.
Resume from governance/execution/PROJECT_STATE.md.
Implement Phase 5.1C corpus manifest tooling only.
Do not deploy or push.
If all gates pass, create one commit: feat: add governed corpus manifest tooling
```

## Resume, validate, and diagnose prompts

```text
Read governance/execution/EXECUTION_MANUAL.md.
Resume the current milestone from governance/execution/PROJECT_STATE.md.
Continue only the next authorized step.
```

```text
Read governance/execution/EXECUTION_MANUAL.md.
Validate the current phase only. Do not change files or commit.
```

```text
Read governance/execution/EXECUTION_MANUAL.md.
Diagnose the failing Phase X.Y gate. Do not implement a fix.
```

## Prompts that require explicit authority

Deployment, pushing, production data changes, cloud/IAM/secret changes, tag operations, migrations, traffic changes, milestone activation, and acceptance-threshold changes must be stated explicitly. They must never be inferred from “implement,” “finish,” “commit,” or “resume.”

## State hygiene

After each completed phase, the phase commit should update `PROJECT_STATE.md`. The next request can then remain short because current branch, baseline, completed work, milestone, remaining work, validation, limitations, and authorization are already recorded in the repository.
