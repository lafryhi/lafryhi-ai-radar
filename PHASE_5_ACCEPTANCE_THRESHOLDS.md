# Phase 5.1 Acceptance and Regression Thresholds

## Status

- Threshold status: Proposed for gate review; entry budgets approved provisionally
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
| THR-LANG-001 | Language-detection accuracy | Correct supported-language labels divided by labeled samples | Threshold unresolved — blocking before language detection enters a later scope | Stratified per-language evaluation | English/French/Arabic cohort composition approved; samples absent | DEFERRED for Phase 5.1; blocks later language-detection scope | No detector exists and Phase 5.1 authorizes no language detection | Product and Editorial Owner + Evaluation Owner |
| THR-URL-001 | Canonical URL rule correctness | Expected canonical result produced for each approved rule fixture | 100% on approved deterministic rule corpus | Table-driven golden fixtures and idempotence properties | Canonical URL and tracking-parameter variants | COMPLETION_BLOCKING | Pure allowlisted transformations must match the contract exactly | Architecture Owner |
| THR-URL-002 | Canonical URL false equivalence | Distinct-resource fixtures collapsed to one canonical URL | 0 observed | Adversarial meaningful-query/path/domain fixtures | False merge traps and canonical variants | COMPLETION_BLOCKING | Conservative URL behavior protects identity | Architecture Owner + Evaluation Owner |
| THR-FP-001 | Fingerprint determinism | Identical framed byte inputs yielding identical fingerprint across runs/runtimes | 100% | Golden vectors across supported Node runtimes and repeated runs | Synthetic canonical payload fixtures | COMPLETION_BLOCKING | Deterministic identity is the purpose of the fingerprint | Architecture Owner |
| THR-FP-002 | Fingerprint mutation sensitivity | Meaningfully different framed inputs yielding different fingerprints in evaluated corpus | 100% observed; zero observed collisions | Pairwise/adversarial golden vectors | Exact/unrelated/false merge fixtures | COMPLETION_BLOCKING | Any observed collision is critical; SHA-256 theoretical risk is documented, not claimed zero | Architecture Owner + Security and Privacy Owner |
| THR-REP-001 | Full deterministic reproducibility | Same corpus, versions, logical clock, and inputs produce byte-identical result manifest | 100% across at least two clean runs | Manifest/checksum comparison | Released corpus manifest | COMPLETION_BLOCKING | Reproducibility is foundational | Evaluation Owner + Reliability Owner |
| THR-COMP-001 | Backward read compatibility | v1.0.0-rc1 fixtures read with unchanged authoritative values and behavior | 100%; zero regression | Frozen fixture/contract suite | Phase 4 baseline fixtures | COMPLETION_BLOCKING | Baseline compatibility is absolute | Architecture Owner |
| THR-PROV-001 | Provenance completeness | Accepted derived artifacts with every required immutable input/version reference | 100% | Schema/validator tests including missing/unknown references | Synthetic artifact fixtures | COMPLETION_BLOCKING | Untraceable intelligence cannot be accepted | Data Governance Owner |
| THR-LAT-001 | Deterministic Phase 5.1 latency | Warm pure-operation latency by input band; full approved corpus wall clock; incremental CI wall clock | APPROVED_PROVISIONAL: pure p95 ≤2 ms (≤4 KiB), ≤10 ms (>4–256 KiB), ≤50 ms (>256 KiB–2 MiB); local corpus ≤60 s; incremental CI ≤120 s | Per measurement policy: ≥1,000 operations/band in each of 5 processes; 5 corpus runs; first CI run recalibration | `p5-corpus-v0-planned`; content not yet created | ENTRY_BLOCKING budget satisfied; measured pass COMPLETION_BLOCKING | Existing validation medians are 4.228 s test, 7.835 s lint, 2.966 s typecheck, 36.590 s build; offline pure work must not add excessive CI time | Architecture Owner + Operations Owner |
| THR-MODEL-001 | Model-call ceiling | External model calls made by Phase 5.1 | 0 | Network/provider spy and dependency audit | None | ENTRY_BLOCKING and COMPLETION_BLOCKING | Phase 5.1 is deterministic and offline | Architecture Owner |
| THR-COST-001 | External model/API cost | Billable external model/API usage attributable to Phase 5.1 evaluation | 0 | Dependency/network audit and billing-source absence | None | ENTRY_BLOCKING and COMPLETION_BLOCKING | No external service is authorized | Operations Owner |
| THR-COST-002 | Local/CI compute budget | Runtime and bounded artifacts for offline qualification | APPROVED_PROVISIONAL: local corpus ≤60 s; generated artifacts ≤25 MiB; diagnostic logs ≤2 MiB; observed peak RSS ≤512 MiB; incremental CI ≤120 s with artifacts ≤25 MiB and retained logs ≤2 MiB | Stopwatch, byte counts, CI timestamps, and reliable peak-RSS observation; recalibrate after first implementation/CI run | `p5-corpus-v0-planned` | ENTRY_BLOCKING budget satisfied; measured pass COMPLETION_BLOCKING | Values are enforceable resource ceilings without inventing CI pricing | Operations Owner |
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

Numeric composition is approved in `PHASE_5_INITIAL_CORPUS_COMPOSITION.md`: 240 unique documents and 385 pair/group/variant-set units. Planned evaluated cohorts contain 30 English, 30 French, and 30 Arabic documents. The corpus is not created, so no empirical validation claim exists.

## Current threshold conclusion

Entry budget states:

- `THR-LAT-001`: `APPROVED_PROVISIONAL`.
- `THR-COST-002`: `APPROVED_PROVISIONAL`.
- `THR-COST-001`: External paid model/API cost ceiling remains exactly USD 0.00.

Phase 5.1B development evidence:

- `THR-URL-001`: 18/18 development URL outcomes and 12/12 accepted URL idempotence checks pass.
- `THR-URL-002`: zero false equivalence in the synthetic development fixtures; full-corpus evidence remains.
- `THR-FP-001`: 11/11 repeated development fingerprints match; five-process latency tests also repeat deterministic outputs.
- `THR-FP-002`: zero observed development collisions across tested domain/boundary/mutation cases; theoretical collision risk remains.
- `THR-LAT-001`: five-process p95 measurements pass all three reference bands; full-corpus and first-CI recalibration remain.
- `THR-COST-002`: focused median 16.429 seconds, qualification median 1.522 seconds, zero persistent artifacts/logs; peak RSS was not reliably measurable.
- `THR-TEL-001`, `THR-SEC-001`, `THR-MODEL-001`, and `THR-FS-001`: development audits report zero violations.

These results are `DEVELOPMENT QUALIFICATION ONLY`. Completion-blocking thresholds remain open until the approved corpus and holdout evidence exist.

These are reference-environment budgets, not measured Phase 5.1 performance. The first implementation and CI measurements may tighten or relax them only through documented review. All other entry invariants retain zero-tolerance or structural thresholds.

## THR-LAT-001 measurement contract

### Pure operations

Input-size bands use exact UTF-8 byte length of the primary input:

- small: up to 4 KiB;
- medium: greater than 4 KiB through 256 KiB;
- large: greater than 256 KiB through 2 MiB.

Each operation/size band requires at least 1,000 warm observations in each of five separate process runs. Nearest-rank p95 must remain within the provisional ceiling. A run also fails on nondeterministic output, non-zero exit, or prohibited side effect.

Regression rule: after an implementation baseline is accepted, a later version fails if its p95 exceeds the absolute ceiling or regresses by more than 25% in two repeated reference runs, unless an approved evidence-based budget revision exists.

### Corpus evaluation

The complete `p5-corpus-v0-planned` qualification run must finish within 60 seconds locally on the captured reference environment after one setup/warm-up pass. Five measured runs are required. Corpus creation and results remain completion requirements.

### CI increment

Phase 5.1 tests may add no more than 120 seconds to the established CI validation sequence. This is provisional until the first CI run captures runner specifications and actual incremental timing.

## THR-COST-002 measurement contract

### External monetary cost

- Gemini calls: 0.
- Vertex AI calls: 0.
- Paid external API calls: 0.
- Firestore writes: 0.
- Cloud Run deployments: 0.
- Authorized external paid-service cost: **USD 0.00**.

Any non-zero paid-service use is a scope violation requiring separate authorization.

### Local compute

- Complete corpus run: at most 60 seconds.
- Generated result/artifact directory, excluding governed source fixtures: at most 25 MiB.
- Diagnostic logs/reports: at most 2 MiB.
- Peak process RSS: observe reliably during implementation; provisional ceiling 512 MiB.
- Cleanup: ephemeral run directories are removed after results/checksums are recorded; governed corpus and release evidence follow retention policy.

### CI compute

- Incremental wall-clock: at most 120 seconds.
- Generated retained artifacts: at most 25 MiB.
- Retained diagnostic logs: at most 2 MiB.
- Paid network calls and secret requirements: zero.
- Monetary CI value: not stated because verified runner billing information is unavailable.
