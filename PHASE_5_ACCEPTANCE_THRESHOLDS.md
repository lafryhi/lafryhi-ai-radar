# Phase 5.1 Acceptance and Regression Thresholds

## Status

- Threshold status: Proposed for gate review
- Review date: 2026-07-27
- Empirical validation status: Not started
- Accountable owner: Evaluation Owner
- Approval roles: Product and Editorial Owner; Architecture Owner
- Scope: Deterministic offline Phase 5.1 foundation

These thresholds are initial contract targets, not measured results. A target becomes validated only after the governed corpus and implementation produce reproducible evidence.

## Classification

- **ENTRY_BLOCKING:** Must be resolved before implementation begins.
- **COMPLETION_BLOCKING:** May be measured during authorized implementation but must pass before Phase 5.1 completes.
- **NON_BLOCKING:** Reported for learning; cannot waive a hard invariant.
- **DEFERRED:** Outside the authorized Phase 5.1 scope.

## Threshold register

| Metric ID | Metric | Definition | Proposed threshold | Measurement method | Corpus dependency | Classification | Rationale | Revision authority |
|---|---|---|---|---|---|---|---|---|
| THR-DUP-001 | Exact duplicate precision | True exact-equivalent pairs divided by all pairs classified exact duplicate | 100% for the approved identity-equivalence contract | Blind labeled pair evaluation; every false merge inspected | Exact duplicates, unrelated, false merge traps, same publisher/different article | COMPLETION_BLOCKING | An exact identity claim cannot tolerate known false equivalence | Evaluation Owner + Architecture Owner |
| THR-DUP-002 | Exact duplicate recall | Exact-equivalent pairs detected divided by all labeled exact-equivalent pairs within supported normalization rules | 100% within the explicitly supported equivalence set | Labeled variants and property-based transformations | Exact duplicates, false split traps, URL variants | COMPLETION_BLOCKING | Deterministic supported transformations should be complete | Evaluation Owner |
| THR-DUP-003 | Near-duplicate precision | True near duplicates divided by all near-duplicate predictions | Deferred; no near-duplicate classifier is authorized | Future labeled evaluation | Near duplicates, updates, syndication, false merge traps | DEFERRED | Outside Phase 5.1 | Evaluation Owner + Product and Editorial Owner |
| THR-DUP-004 | Near-duplicate recall | Detected near duplicates divided by all labeled near duplicates | Deferred; no near-duplicate classifier is authorized | Future labeled evaluation | Near duplicates and false split traps | DEFERRED | Outside Phase 5.1 | Evaluation Owner |
| THR-MERGE-001 | False merge rate | Distinct records incorrectly given exact-equivalent identity divided by distinct evaluated pairs | 0 observed critical false merges; any occurrence fails | Negative pair corpus and adversarial property tests | Unrelated, updated, common-event, false merge traps | COMPLETION_BLOCKING | A false merge can hide distinct information | Architecture Owner + Evaluation Owner |
| THR-SPLIT-001 | False split rate | Supported exact-equivalent variants incorrectly separated divided by eligible equivalent pairs | 0 within approved deterministic equivalence rules | Positive transformation corpus | Exact duplicates, URL/tracking variants, false split traps | COMPLETION_BLOCKING | Supported pure transformations must be deterministic | Evaluation Owner |
| THR-LANG-001 | Language-detection accuracy | Correct supported-language labels divided by labeled samples | Threshold unresolved — blocking before language detection enters scope | Stratified per-language evaluation | Multilingual and mixed-language corpus; cohorts/counts unresolved | DEFERRED for Phase 5.1; blocks later language scope | No detector or approved language cohort exists | Product and Editorial Owner + Evaluation Owner |
| THR-URL-001 | Canonical URL rule correctness | Expected canonical result produced for each approved rule fixture | 100% on approved deterministic rule corpus | Table-driven golden fixtures and idempotence properties | Canonical URL and tracking-parameter variants | COMPLETION_BLOCKING | Pure allowlisted transformations must match the contract exactly | Architecture Owner |
| THR-URL-002 | Canonical URL false equivalence | Distinct-resource fixtures collapsed to one canonical URL | 0 observed | Adversarial meaningful-query/path/domain fixtures | False merge traps and canonical variants | COMPLETION_BLOCKING | Conservative URL behavior protects identity | Architecture Owner + Evaluation Owner |
| THR-FP-001 | Fingerprint determinism | Identical framed byte inputs yielding identical fingerprint across runs/runtimes | 100% | Golden vectors across supported Node runtimes and repeated runs | Synthetic canonical payload fixtures | COMPLETION_BLOCKING | Deterministic identity is the purpose of the fingerprint | Architecture Owner |
| THR-FP-002 | Fingerprint mutation sensitivity | Meaningfully different framed inputs yielding different fingerprints in evaluated corpus | 100% observed; zero observed collisions | Pairwise/adversarial golden vectors | Exact/unrelated/false merge fixtures | COMPLETION_BLOCKING | Any observed collision is critical; SHA-256 theoretical risk is documented, not claimed zero | Architecture Owner + Security and Privacy Owner |
| THR-REP-001 | Full deterministic reproducibility | Same corpus, versions, logical clock, and inputs produce byte-identical result manifest | 100% across at least two clean runs | Manifest/checksum comparison | Released corpus manifest | COMPLETION_BLOCKING | Reproducibility is foundational | Evaluation Owner + Reliability Owner |
| THR-COMP-001 | Backward read compatibility | v1.0.0-rc1 fixtures read with unchanged authoritative values and behavior | 100%; zero regression | Frozen fixture/contract suite | Phase 4 baseline fixtures | COMPLETION_BLOCKING | Baseline compatibility is absolute | Architecture Owner |
| THR-PROV-001 | Provenance completeness | Accepted derived artifacts with every required immutable input/version reference | 100% | Schema/validator tests including missing/unknown references | Synthetic artifact fixtures | COMPLETION_BLOCKING | Untraceable intelligence cannot be accepted | Data Governance Owner |
| THR-LAT-001 | Normalization/canonicalization/fingerprint latency | Processing duration by input-size cohort on a pinned reference environment | Threshold unresolved — blocking | Establish baseline and propose p95/p99 budget before implementation authorization | Corpus size/HTML/text distribution unresolved | ENTRY_BLOCKING | No implementation or representative corpus exists; a numeric claim would be fabricated | Architecture Owner + Operations Owner |
| THR-MODEL-001 | Model-call ceiling | External model calls made by Phase 5.1 | 0 | Network/provider spy and dependency audit | None | ENTRY_BLOCKING and COMPLETION_BLOCKING | Phase 5.1 is deterministic and offline | Architecture Owner |
| THR-COST-001 | External model/API cost | Billable external model/API usage attributable to Phase 5.1 evaluation | 0 | Dependency/network audit and billing-source absence | None | ENTRY_BLOCKING and COMPLETION_BLOCKING | No external service is authorized | Operations Owner |
| THR-COST-002 | Local/CI compute budget | Maximum runtime/resource cost for full corpus evaluation | Threshold unresolved — blocking | Approve corpus composition and measure a baseline job before implementation authorization | Corpus counts unresolved | ENTRY_BLOCKING | No representative job exists; a number would be unsupported | Operations Owner |
| THR-TEL-001 | Telemetry compliance | Serialized evaluation events containing a prohibited field or value | 0 | Adversarial denylist/allowlist scanner | Synthetic privacy fixtures | COMPLETION_BLOCKING | Protected data leakage is unacceptable | Security and Privacy Owner |
| THR-SEC-001 | Security violations | Unauthorized network, credential, production adapter, filesystem, or write capability observed | 0 | Isolation and capability tests | Synthetic harness fixtures | COMPLETION_BLOCKING | Offline boundary is absolute | Security and Privacy Owner |
| THR-P4-001 | Phase 4 regression tolerance | Failed existing tests or changed frozen contract behavior | 0 failures; 190/190 baseline tests and all added compatibility tests pass | Full baseline and compatibility suite | Phase 4 fixtures | ENTRY_BLOCKING baseline and COMPLETION_BLOCKING | Phase 4 is frozen | Architecture Owner |
| THR-FS-001 | Unauthorized Firestore writes | Firestore write attempts from Phase 5.1 | 0 | No Firestore adapter dependency plus write spy/deny tests | None | ENTRY_BLOCKING and COMPLETION_BLOCKING | Scope is offline with no production writes | Security and Privacy Owner |
| THR-AUTH-001 | Automatic approval | Approval transitions caused by Phase 5.1 | 0 | Capability/dependency and state-transition tests | Phase 4 workflow fixtures | ENTRY_BLOCKING and COMPLETION_BLOCKING | Human approval remains mandatory | Product and Editorial Owner |
| THR-PUB-001 | Automatic publication | Publication operations caused by Phase 5.1 | 0 | Capability/dependency and publication-state tests | Phase 4 workflow fixtures | ENTRY_BLOCKING and COMPLETION_BLOCKING | Phase 5 has no publication authority | Product and Editorial Owner |
| THR-DEL-001 | Destructive duplicate deletion | Source or derived authoritative records deleted due to duplicate logic | 0 | Mutation/deletion spy and retained-record fixtures | Duplicate/conflict fixtures | COMPLETION_BLOCKING | Suppression and identity must be lossless | Data Governance Owner |
| THR-EVID-001 | Evidence-integrity relaxation | Previously invalid evidence accepted or validation rules weakened | 0 | Frozen Phase 4 evidence suite | Evidence regression fixtures | ENTRY_BLOCKING and COMPLETION_BLOCKING | Exact grounding remains authoritative | Security and Privacy Owner |

## Hard requirements

The following have zero tolerance:

- Phase 4 evidence-integrity relaxation;
- automatic approval;
- automatic publication;
- destructive duplicate deletion;
- prohibited telemetry fields;
- unauthorized Firestore writes;
- production network or credential access from the offline harness;
- missing provenance in an accepted derived artifact;
- nondeterminism in deterministic algorithms;
- baseline behavior regressions.

## Corpus composition dependency

Numeric minimum sample counts and supported language cohorts are not yet approved. This prevents empirical validation claims but does not itself replace the explicit entry blockers above. It must be resolved before the corpus is released and before Phase 5.1 completion evaluation.

## Current threshold conclusion

The threshold set is not ready for implementation entry:

- `THR-LAT-001`: Threshold unresolved — blocking.
- `THR-COST-002`: Threshold unresolved — blocking.

All other Phase 5.1 entry invariants have explicit zero-tolerance or structural thresholds. No metric is described as empirically validated.
