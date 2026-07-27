# Phase 5.1 Entry Risk Resolution

## Status

- Assessment date: 2026-07-27
- Scope: Entry to offline 5.1A/5.1B only
- Risks assessed: Eight previously blocking P0 risks
- Risks closed: 0
- Risks remaining blocking implementation entry: 0
- Risks mitigated non-blocking for offline implementation: 8

No risk is described as resolved. Policy and design evidence permits safe offline implementation to produce the exit tests; completion remains blocked until those tests pass.

## Summary

| Risk ID | Final milestone classification | Entry effect | Completion effect |
|---|---|---|---|
| P5-RISK-001 | MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1 | Does not block 5.1A | Exit tests required |
| P5-RISK-002 | MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1 | Does not block 5.1A | Golden vectors required |
| P5-RISK-003 | MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1 | Does not block 5.1A | Provenance tests required |
| P5-RISK-006 | MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1 | Does not block pure implementation | Corpus precision evidence required |
| P5-RISK-010 | MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1 | Does not block 5.1B after 5.1A | Determinism/collision/privacy evidence required |
| P5-RISK-011 | MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1 | Does not block 5.1B after 5.1A | URL corpus evidence required |
| P5-RISK-029 | MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1 | Does not block test-local harness | Privacy tests required |
| P5-RISK-034 | MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1 | Does not block offline harness | Isolation/capability tests required |

## Individual reviews

### P5-RISK-001 — Derived artifact platform

- **Original risk:** Phase 5 mutates or conflicts with frozen records.
- **Owner:** Architecture Owner
- **Milestone relevance:** 5.1A artifact envelope.
- **Current likelihood:** Low within offline scope; Medium before enforcement tests.
- **Impact:** High.
- **Mitigation evidence:** Additive compatibility contracts; no persistence scope; feasible pure-module boundary.
- **Exit evidence requirement:** Tests proving no Phase 4 mutation across dependency boundaries.
- **Evidence produced now:** COMP-P4/DATA contracts and repository isolation analysis.
- **Residual uncertainty:** No implementation/import test exists.
- **Final classification:** MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1.
- **Justification:** Writing pure types/validators is needed to produce the exit tests; production records/adapters are prohibited.

### P5-RISK-002 — Deterministic identities

- **Original risk:** Canonical serialization changes cause duplicates or collisions.
- **Owner:** Architecture Owner
- **Milestone relevance:** 5.1A envelope identity and 5.1B fingerprint.
- **Current likelihood:** Medium until golden vectors exist.
- **Impact:** High.
- **Mitigation evidence:** Versioned domain-separated length framing; deterministic-clock/order contracts.
- **Exit evidence requirement:** Cross-runtime golden vectors, namespace/version separation, and upgrade behavior.
- **Evidence produced now:** COMP-ID-007 plus measurement/reproducibility policy.
- **Residual uncertainty:** Implementation bytes and runtime results unmeasured.
- **Final classification:** MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1.
- **Justification:** Contract is sufficient to implement offline; evidence is completion-blocking.

### P5-RISK-003 — Provenance graph

- **Original risk:** Derived claims lose evidence lineage.
- **Owner:** Architecture Owner.
- **Milestone relevance:** 5.1A provenance value objects only.
- **Current likelihood:** Medium until validators exist.
- **Impact:** High.
- **Mitigation evidence:** Immutable provenance contract and 100% completeness threshold.
- **Exit evidence requirement:** Missing/unknown/mutation negative tests.
- **Evidence produced now:** COMP-DATA-003/004 and restricted 5.1A scope.
- **Residual uncertainty:** Validator behavior unimplemented.
- **Final classification:** MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1.
- **Justification:** Graph persistence is excluded; pure provenance objects must be implemented to test them.

### P5-RISK-006 — Exact duplicate detection

- **Original risk:** Hash or normalization falsely equates distinct content.
- **Owner:** Architecture Owner.
- **Milestone relevance:** Exact-identity qualification, not production suppression.
- **Current likelihood:** Medium until corpus results exist.
- **Impact:** High.
- **Mitigation evidence:** Conservative contracts; 40 exact pairs, 130 false-merge-oriented pairs, and zero-tolerance thresholds approved.
- **Exit evidence requirement:** 100% precision and zero critical false merge on the governed corpus.
- **Evidence produced now:** Numeric composition and threshold contracts; corpus does not yet exist.
- **Residual uncertainty:** Actual rules and results unavailable.
- **Final classification:** MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1.
- **Justification:** No production classification/suppression is allowed; corpus evidence is milestone-completion blocking.

### P5-RISK-010 — Source fingerprinting

- **Original risk:** Fingerprints leak or enable reidentification and may be nondeterministic.
- **Owner:** Security and Privacy Owner.
- **Milestone relevance:** 5.1B.
- **Current likelihood:** Low for production exposure because none is allowed; Medium for implementation defect.
- **Impact:** High.
- **Mitigation evidence:** Input/privacy prohibitions, SHA-256 framing contract, no telemetry default.
- **Exit evidence requirement:** Golden vectors, zero observed collisions, mutation tests, privacy/input audit.
- **Evidence produced now:** COMP-ID-007, privacy contract, isolation evidence.
- **Residual uncertainty:** No implementation or vectors.
- **Final classification:** MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1.
- **Justification:** 5.1B occurs only after 5.1A isolation tests; production logging/persistence remain prohibited.

### P5-RISK-011 — URL canonicalization

- **Original risk:** Different resources merge or credentials enter telemetry.
- **Owner:** Architecture Owner.
- **Milestone relevance:** 5.1B.
- **Current likelihood:** Medium until adversarial corpus results.
- **Impact:** High.
- **Mitigation evidence:** Conservative allowlist contract; 30 URL sets, 25 tracking sets, false-merge traps, and privacy denylist approved.
- **Exit evidence requirement:** 100% rule correctness and zero false equivalence on approved fixtures.
- **Evidence produced now:** Numeric corpus design and threshold contract.
- **Residual uncertainty:** Corpus and algorithm do not exist.
- **Final classification:** MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1.
- **Justification:** Offline implementation is required to measure; no production identity/suppression is authorized.

### P5-RISK-029 — Operational telemetry

- **Original risk:** Protected content or secrets enter events.
- **Owner:** Security and Privacy Owner.
- **Milestone relevance:** Test-local evaluation diagnostics.
- **Current likelihood:** Low under allowlist design; Medium until adversarial tests.
- **Impact:** High.
- **Mitigation evidence:** Approved field allowlist/denylist, RET-0 boundary, 2 MiB log ceiling, no production emitter.
- **Exit evidence requirement:** Adversarial serialization tests with zero prohibited fields.
- **Evidence produced now:** Privacy contract and local/CI artifact budgets.
- **Residual uncertainty:** Harness serialization unimplemented.
- **Final classification:** MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1.
- **Justification:** Test-local diagnostics are necessary to produce evidence; production telemetry remains deferred.

### P5-RISK-034 — Replay simulator

- **Original risk:** Sanitized fixtures leak data or contact production.
- **Owner:** Reliability Owner.
- **Milestone relevance:** Offline corpus harness only; no replay product.
- **Current likelihood:** Low under proposed dependency boundary; Medium until capability tests.
- **Impact:** High.
- **Mitigation evidence:** Repository-backed isolation feasibility, no network/Firestore/provider/auth imports, synthetic/open fixtures.
- **Exit evidence requirement:** Tests proving production network, credentials, adapters, writes, and endpoints are unreachable.
- **Evidence produced now:** `ISOLATION_FEASIBLE_WITH_LIMITATIONS` assessment and corpus privacy policy.
- **Residual uncertainty:** Import/capability enforcement is not implemented.
- **Final classification:** MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1.
- **Justification:** Enforcement tests are a 5.1A output; the harness cannot be used in production or as a production replay endpoint.

## Conclusion

The risks remain open for milestone completion, but none requires a production capability or pre-existing implementation artifact before offline implementation begins. Reclassification does not lower exit criteria; it places them at the earliest logically achievable gate.
