# Phase 5.1 Entry Risk Resolution

## Status

- Assessment date: 2026-07-27
- Scope: Entry to offline 5.1A/5.1B only
- Risks assessed: Eight previously blocking P0 risks
- Risks closed globally: 0
- Risks closed for 5.1A entry: 4
- Risks remaining blocking implementation entry: 0
- Risks with implemented 5.1A/5.1B evidence: 8

No risk is described as resolved. Policy and design evidence permits safe offline implementation to produce the exit tests; completion remains blocked until those tests pass.

## Summary

| Risk ID | Final milestone classification | Entry effect | Completion effect |
|---|---|---|---|
| P5-RISK-001 | CLOSED_FOR_ENTRY | 5.1A evidence complete | Reassess before persistence/production |
| P5-RISK-002 | MITIGATED_NON_BLOCKING_FOR_MILESTONE | Development vectors pass | Cross-runtime/full-corpus vectors required |
| P5-RISK-003 | CLOSED_FOR_ENTRY | 5.1A provenance evidence complete | Reassess for graph/persistence |
| P5-RISK-006 | MITIGATED_NON_BLOCKING_FOR_MILESTONE | Development exact classifier passes | Full-corpus precision evidence required |
| P5-RISK-010 | MITIGATED_NON_BLOCKING_FOR_MILESTONE | Framed fingerprints and privacy tests pass | Cross-runtime/full-corpus evidence required |
| P5-RISK-011 | MITIGATED_NON_BLOCKING_FOR_MILESTONE | Conservative URL development suite passes | Full URL corpus evidence required |
| P5-RISK-029 | CLOSED_FOR_OFFLINE_5_1B | Bounded harness privacy tests pass | Reassess before any production telemetry |
| P5-RISK-034 | CLOSED_FOR_OFFLINE_5_1B | In-memory harness isolation passes | Reassess before any replay/product capability |

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
- **Evidence produced now:** Versioned SHA-256 domain separation, UTF-8 length framing, mutation tests, 11/11 repeatability, and five-process measurements.
- **Residual uncertainty:** Full-corpus and cross-runtime golden-vector evidence remains.
- **Final classification:** MITIGATED_NON_BLOCKING_FOR_MILESTONE.
- **Justification:** Development implementation evidence passes; broader completion evidence remains.

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
- **Evidence produced now:** Advisory exact classifier, conflict-first rules, 6/6 development precision/recall, and zero false merges/splits.
- **Residual uncertainty:** The full governed corpus and holdout do not exist.
- **Final classification:** MITIGATED_NON_BLOCKING_FOR_MILESTONE.
- **Justification:** Offline development evidence passes without suppression; corpus precision remains completion-blocking.

### P5-RISK-010 — Source fingerprinting

- **Original risk:** Fingerprints leak or enable reidentification and may be nondeterministic.
- **Owner:** Security and Privacy Owner.
- **Milestone relevance:** 5.1B.
- **Current likelihood:** Low for production exposure because none is allowed; Medium for implementation defect.
- **Impact:** High.
- **Mitigation evidence:** Input/privacy prohibitions, SHA-256 framing contract, no telemetry default.
- **Exit evidence requirement:** Golden vectors, zero observed collisions, mutation tests, privacy/input audit.
- **Evidence produced now:** Implemented framed SHA-256 types, domain separation, determinism/mutation tests, bounded reports that omit fingerprints, and zero telemetry findings.
- **Residual uncertainty:** Cross-runtime/full-corpus collision observations and access policy remain.
- **Final classification:** MITIGATED_NON_BLOCKING_FOR_MILESTONE.
- **Justification:** Offline fingerprints pass development evidence and remain absent from production/report telemetry.

### P5-RISK-011 — URL canonicalization

- **Original risk:** Different resources merge or credentials enter telemetry.
- **Owner:** Architecture Owner.
- **Milestone relevance:** 5.1B.
- **Current likelihood:** Medium until adversarial corpus results.
- **Impact:** High.
- **Mitigation evidence:** Conservative allowlist contract; 30 URL sets, 25 tracking sets, false-merge traps, and privacy denylist approved.
- **Exit evidence requirement:** 100% rule correctness and zero false equivalence on approved fixtures.
- **Evidence produced now:** Implemented allowlisted normalizer; 18/18 outcomes, 12/12 idempotence, credential/privacy rejection, and zero development false equivalence.
- **Residual uncertainty:** Full 30 URL/25 tracking sets and holdout are absent.
- **Final classification:** MITIGATED_NON_BLOCKING_FOR_MILESTONE.
- **Justification:** Conservative development evidence passes; full-corpus evidence remains.

### P5-RISK-029 — Operational telemetry

- **Original risk:** Protected content or secrets enter events.
- **Owner:** Security and Privacy Owner.
- **Milestone relevance:** Test-local evaluation diagnostics.
- **Current likelihood:** Low under allowlist design; Medium until adversarial tests.
- **Impact:** High.
- **Mitigation evidence:** Approved field allowlist/denylist, RET-0 boundary, 2 MiB log ceiling, no production emitter.
- **Exit evidence requirement:** Adversarial serialization tests with zero prohibited fields.
- **Evidence produced now:** Bounded safe validation-error adapter, secret-marker redaction test, and static prohibition of console/production telemetry imports.
- **Residual uncertainty:** Production telemetry remains unaudited and unauthorized.
- **Final classification:** CLOSED_FOR_OFFLINE_5_1B.
- **Justification:** The bounded in-memory report and protected-marker scans pass with zero prohibited telemetry.

### P5-RISK-034 — Replay simulator

- **Original risk:** Sanitized fixtures leak data or contact production.
- **Owner:** Reliability Owner.
- **Milestone relevance:** Offline corpus harness only; no replay product.
- **Current likelihood:** Low under proposed dependency boundary; Medium until capability tests.
- **Impact:** High.
- **Mitigation evidence:** Repository-backed isolation feasibility, no network/Firestore/provider/auth imports, synthetic/open fixtures.
- **Exit evidence requirement:** Tests proving production network, credentials, adapters, writes, and endpoints are unreachable.
- **Evidence produced now:** Static production-file enumeration and prohibited import/capability tests pass; no route, service, repository, provider, auth, network, write, clock, randomness, logging, or mutable state is used.
- **Residual uncertainty:** Full-corpus file loading and any later replay product require renewed isolation review.
- **Final classification:** CLOSED_FOR_OFFLINE_5_1B.
- **Justification:** The in-memory harness is implemented and its dependency/capability tests pass; no replay endpoint exists.

## Conclusion

No risk is erased globally. Offline development evidence closes P5-RISK-029 and P5-RISK-034 for 5.1B and mitigates identity, exact-duplicate, fingerprint, and URL risks pending the full corpus/cross-runtime evidence. Production variants remain deferred.
