# Quality Gates

This document centralizes execution-level acceptance. More specific, stricter phase thresholds remain authoritative, especially [`PHASE_5_ACCEPTANCE_THRESHOLDS.md`](../../PHASE_5_ACCEPTANCE_THRESHOLDS.md), [`PHASE_5_ENTRY_GATE.md`](../../PHASE_5_ENTRY_GATE.md), and the Phase 4 production verification protocol.

## Requirement classifications

- **PASS:** The required operation was executed, the expected result was observed, and every applicable invariant and threshold passed.
- **FAIL:** An executed check produced an incorrect result; an invariant, threshold, test, compatibility boundary, privacy rule, or safety rule was violated; or required evidence is missing where the gate demands execution.
- **LIMITATION:** Residual uncertainty or unavailable evidence is explicitly recorded. A limitation is not a PASS and may be non-blocking only when controlling governance says so.
- **NOT_EXECUTABLE_BY_DESIGN:** Use only under the criteria in [`GEMINI_XPRIZE_PHASE4_PRODUCTION_VERIFICATION_PROTOCOL.md`](../../GEMINI_XPRIZE_PHASE4_PRODUCTION_VERIFICATION_PROTOCOL.md). It does not generalize into permission to skip tests.

Do not average failures into a passing aggregate.

## Universal acceptance gates

A phase PASS requires all applicable gates:

1. **Authority:** scope and entry are explicitly authorized.
2. **Repository safety:** intended files only; user work preserved; no unauthorized external change.
3. **Correctness:** focused and full tests pass.
4. **Static quality:** lint and typecheck pass.
5. **Build:** the production build passes when the repository provides one.
6. **Compatibility:** frozen production contracts and prior accepted behaviors do not regress.
7. **Architecture:** accepted ADRs, dependency boundaries, and isolation rules are respected.
8. **Privacy/security:** prohibited data and unsafe access are absent.
9. **Determinism/idempotency/bounds:** applicable governed invariants pass.
10. **Performance/cost:** applicable thresholds pass using the governed measurement method.
11. **Documentation/evidence:** exact results and limitations are repository-resident.
12. **Audit:** no test weakening, silent threshold reduction, fabricated review, or scope creep exists.

## Milestone qualification

- Passing a test, task, step, or sub-slice qualifies only that unit.
- A milestone qualifies only after every completion-blocking gate passes on the approved evidence set and all required reviews are real and recorded.
- `READY_WITH_NON_BLOCKING_LIMITATIONS` permits only the scope explicitly named by the corresponding gate.
- Development qualification does not equal full corpus, shadow, advisory, production, or release qualification.
- Shadow success does not authorize advisory activation; advisory success does not authorize automated decisions or publication.
- Implementation completion does not authorize deployment.
- A later milestone never becomes authorized merely because its predecessor code exists.

## Regression rules

- Any regression against the frozen Phase 4 baseline, accepted compatibility contract, or previously passing mandatory test is FAIL.
- A new feature must not weaken human approval, evidence grounding, privacy, atomicity, idempotency, retry/call ceilings, or rollback.
- Thresholds may change only through explicit governance with rationale, owner, evidence, and versioned record. Until then, the stricter existing threshold applies.
- Flaky or environment-sensitive evidence must be investigated and reported; rerunning until green without explanation is not acceptance.
- Pre-existing failures must be recorded before changes and cannot be attributed to the phase without evidence. They still block a full PASS when the applicable gate requires a clean suite.

## Gate report

Each phase report must state:

- overall classification;
- each applicable gate and evidence;
- commands, versions, and exit results;
- blocking and non-blocking limitations;
- regressions checked;
- milestone qualification achieved or explicitly not achieved; and
- production/deployment authorization, normally `None`.
