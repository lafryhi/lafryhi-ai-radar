# Standard Workflow Rules

The mandatory workflow is:

**Read governance → Verify repository → Implement → Test → Audit → Document → Commit → Report**

## 1. Read governance

Start with the execution manual and project state, then read the phase-specific index, scope, roadmap step, accepted ADRs, contracts, thresholds, risks, and previous reports. Governance discovery is part of implementation, not optional preparation.

Output: a precise authorized scope, exclusions, dependencies, and acceptance map.

## 2. Verify repository

Inspect branch, commit, tags, worktree, recent history, repository instructions, manifests, relevant implementation, and baseline validation. Detect user changes and pre-existing failures before editing.

Output: a reproducible baseline and a safe file boundary.

## 3. Implement

Change only the authorized slice. Preserve frozen Phase 4 behavior, compatibility, deterministic and privacy boundaries, human review, bounded failure behavior, and rollback. Do not infer production authority from implementation authority.

Output: the smallest compliant diff.

## 4. Test

Run focused checks while developing and all applicable full-suite, lint, typecheck, build, corpus, compatibility, security, performance, and integration checks before completion.

Output: command-level evidence with honest results and limitations.

## 5. Audit

Review the full diff and behavior for scope creep, regressions, unsafe dependencies, privacy leakage, test weakening, threshold changes, generated noise, and unintended production effects.

Output: an acceptance decision grounded in evidence.

## 6. Document

Record implementation and verification facts without rewriting historical governance. Update project state on completion. State residual uncertainty and unqualified gates explicitly.

Output: durable repository-resident evidence.

## 7. Commit

Stage only intended files, inspect the staged diff, and create the authorized commit. A commit is not permission to push, deploy, migrate, activate, or retag.

Output: one traceable repository checkpoint when requested.

## 8. Report

Lead with PASS or FAIL. Include files changed, governance referenced, validation results, commit hash, current branch, worktree status, limitations, and the next unqualified gate.

Output: a concise handoff that can be verified without reconstructing the chat.

## Failure handling

On failure, stop before commit unless the user explicitly requested a diagnostic or work-in-progress commit. Preserve evidence, distinguish implementation defects from environmental or verification limitations, and report the narrowest action needed to resume. Never deploy or weaken controls to work around a failed gate.
