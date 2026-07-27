# Permanent Safety Rules

These constraints apply to every phase unless a stricter rule governs it.

## Non-negotiable prohibitions

- Never deploy automatically.
- Never push automatically.
- Never create, move, overwrite, or delete a frozen production tag.
- Never weaken, delete, skip, quarantine, or bypass tests to obtain a pass.
- Never bypass governance, entry criteria, accepted architecture decisions, human approval, or quality gates.
- Never fabricate reviewers, approvals, measurements, production evidence, external execution, or stakeholder decisions.
- Never silently lower, reinterpret, or omit an acceptance threshold.
- Never treat a deferred or proposed decision as accepted.
- Never treat offline, development, shadow, or advisory qualification as production authorization.
- Never automatically approve or publish AI output.
- Never expose secrets, credentials, tokens, cookies, prompts, raw model output, source bodies, evidence text, or prohibited personal data in logs, fixtures, reports, commits, or telemetry.
- Never mutate production data, traffic, IAM, secrets, cloud services, or external systems without separate explicit authorization.
- Never overwrite, discard, hide, or commit unrelated user changes.
- Never rewrite historical evidence to conceal a failure or limitation.

## Required safeguards

- Verify exact targets before any destructive or external action.
- Prefer reversible, isolated, deterministic changes.
- Preserve the frozen `v1.0.0-rc1` Phase 4 baseline and its compatibility invariants.
- Keep production behavior unchanged unless the named phase and user instruction explicitly authorize it.
- Maintain mandatory human review and explicit approval for publication.
- Maintain bounded calls, retries, regeneration, persistence, and recovery behavior.
- Preserve atomicity, idempotency, provenance, evidence grounding, and rollback controls.
- Use approved, licensed, privacy-safe, versioned evaluation data.
- Report failures, limitations, residual uncertainty, and unavailable verification plainly.
- Stop when required authority, evidence, or entry criteria are absent.

## Authorization boundaries

Authorization is action-specific. Permission to implement does not include permission to deploy. Permission to commit does not include permission to push. Permission to test does not include permission to use production data or services. Permission for one phase does not include the next phase.

## References

Permanent product-specific constraints remain in:

- [`PHASE_5_COMPATIBILITY_CONTRACTS.md`](../../PHASE_5_COMPATIBILITY_CONTRACTS.md)
- [`PHASE_5_PRIVACY_AND_TELEMETRY_CONTRACT.md`](../../PHASE_5_PRIVACY_AND_TELEMETRY_CONTRACT.md)
- [`PHASE_5_EVALUATION_CORPUS_GOVERNANCE.md`](../../PHASE_5_EVALUATION_CORPUS_GOVERNANCE.md)
- [`PHASE_5_ADR_ACCEPTANCE_RECORD.md`](../../PHASE_5_ADR_ACCEPTANCE_RECORD.md)
- [`PHASE_5_RISK_REGISTER.md`](../../PHASE_5_RISK_REGISTER.md)
- [`OPERATIONS_RUNBOOK.md`](../../OPERATIONS_RUNBOOK.md)
- the root Phase 4 implementation and verification records.
