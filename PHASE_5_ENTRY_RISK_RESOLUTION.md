# Phase 5.1 Entry Risk Resolution

## Status

- Assessment date: 2026-07-27
- Scope: Entry to offline 5.1A/5.1B only
- Risks assessed: Eight previously blocking P0 risks
- Risks closed globally: 0
- Risks closed for 5.1A entry: 4
- Risks remaining blocking implementation entry: 0
- Risks mitigated non-blocking for offline implementation: 8

No risk is described as resolved. Policy and design evidence permits safe offline implementation to produce the exit tests; completion remains blocked until those tests pass.

## Summary

| Risk ID | Final milestone classification | Entry effect | Completion effect |
|---|---|---|---|
| P5-RISK-001 | CLOSED_FOR_ENTRY | 5.1A evidence complete | Reassess before persistence/production |
| P5-RISK-002 | MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1 | Does not block 5.1A | Golden vectors required |
| P5-RISK-003 | CLOSED_FOR_ENTRY | 5.1A provenance evidence complete | Reassess for graph/persistence |
| P5-RISK-006 | DEFERRED_OUTSIDE_5_1A | Moves to 5.1B qualification | Corpus precision evidence required |
| P5-RISK-010 | DEFERRED_OUTSIDE_5_1A | Moves to 5.1B fingerprint generation | Determinism/collision/privacy evidence required |
| P5-RISK-011 | DEFERRED_OUTSIDE_5_1A | Moves to 5.1B URL normalization | URL corpus evidence required |
| P5-RISK-029 | CLOSED_FOR_ENTRY | Safe contract errors and no logging proven | Harness telemetry tests remain for 5.1B |
| P5-RISK-034 | CLOSED_FOR_ENTRY | Pure-module imports/capabilities proven | Harness isolation retested in 5.1B |

## Individual reviews

### P5-RISK-001 — Derived artifact platform

- **Original risk:** Phase 5 mutates or conflicts with frozen records.
- **Owner:** Architecture Owner
- **Milestone relevance:** 5.1A artifact envelope.
- **Current likelihood:** Low within offline scope; Medium before enforcement tests.
- **Impact:** High.
- **Mitigation evidence:** Additive compatibility contracts; no persistence scope; feasible pure-module boundary.
- **Exit evidence requirement:** Tests proving no Phase 4 mutation across dependency boundaries.
- **Evidence produced now:** Strict pure modules, enumerated import/capability tests, 209/209 full regression tests, and a changed-file audit showing no Phase 4 modification.
- **Residual uncertainty:** Production persistence remains outside scope and requires a later review.
- **Final classification:** CLOSED_FOR_ENTRY.
- **Justification:** The 5.1A mutation/dependency entry criterion is now directly tested.

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
- **Evidence produced now:** Strict provenance schema and tests for missing references, bounds, duplicates, overlap, correction/supersession lineage, and unknown keys.
- **Residual uncertainty:** Graph and persistence behavior remain deferred.
- **Final classification:** CLOSED_FOR_ENTRY.
- **Justification:** Required 5.1A provenance validation exists and passes.

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
- **Final classification:** DEFERRED_OUTSIDE_5_1A.
- **Justification:** Exact duplicate qualification belongs to 5.1B; 5.1A added no classifier or suppression.

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
- **Final classification:** DEFERRED_OUTSIDE_5_1A.
- **Justification:** Fingerprint generation is explicitly a 5.1B utility; only its ID validation contract exists.

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
- **Final classification:** DEFERRED_OUTSIDE_5_1A.
- **Justification:** URL normalization is explicitly a 5.1B utility and was not implemented.

### P5-RISK-029 — Operational telemetry

- **Original risk:** Protected content or secrets enter events.
- **Owner:** Security and Privacy Owner.
- **Milestone relevance:** Test-local evaluation diagnostics.
- **Current likelihood:** Low under allowlist design; Medium until adversarial tests.
- **Impact:** High.
- **Mitigation evidence:** Approved field allowlist/denylist, RET-0 boundary, 2 MiB log ceiling, no production emitter.
- **Exit evidence requirement:** Adversarial serialization tests with zero prohibited fields.
- **Evidence produced now:** Bounded safe validation-error adapter, secret-marker redaction test, and static prohibition of console/production telemetry imports.
- **Residual uncertainty:** 5.1B harness diagnostics remain unimplemented.
- **Final classification:** CLOSED_FOR_ENTRY.
- **Justification:** 5.1A error reporting is privacy-safe; 5.1B must add its own harness tests.

### P5-RISK-034 — Replay simulator

- **Original risk:** Sanitized fixtures leak data or contact production.
- **Owner:** Reliability Owner.
- **Milestone relevance:** Offline corpus harness only; no replay product.
- **Current likelihood:** Low under proposed dependency boundary; Medium until capability tests.
- **Impact:** High.
- **Mitigation evidence:** Repository-backed isolation feasibility, no network/Firestore/provider/auth imports, synthetic/open fixtures.
- **Exit evidence requirement:** Tests proving production network, credentials, adapters, writes, and endpoints are unreachable.
- **Evidence produced now:** Static production-file enumeration and prohibited import/capability tests pass; no route, service, repository, provider, auth, network, write, clock, randomness, logging, or mutable state is used.
- **Residual uncertainty:** The 5.1B corpus harness does not yet exist and must be re-audited.
- **Final classification:** CLOSED_FOR_ENTRY.
- **Justification:** 5.1A isolation is implemented and tested; no replay endpoint exists.

## Conclusion

No risk is erased globally. Four are closed for the completed 5.1A entry boundary, one remains mitigated pending 5.1B golden vectors, and three are deferred to the 5.1B utilities they govern.
