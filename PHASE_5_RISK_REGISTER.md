# Phase 5 Risk Register

## Status and ownership

This register is proposed. Owners are accountable roles, not named individuals. Assignment to a person and approval of exit evidence are required before implementation begins.

Likelihood and impact use `Low`, `Medium`, or `High`. Priority uses `P0` (release-blocking safety), `P1` (high), `P2` (medium), or `P3` (low).

The `Planned feature` value remains the canonical risk name. Stable numeric aliases are assigned below for cross-document governance. A materially different risk receives a new ID and row rather than reusing an existing identifier.

| Planned feature | Risk | Likelihood | Impact | Mitigation | Owner | Priority | Exit criteria |
|---|---|---:|---:|---|---|---:|---|
| Derived artifact platform | Phase 5 mutates or conflicts with frozen records | Medium | High | Additive namespaces, immutable references, permission tests, rollback isolation | Platform Lead | P0 | Contract tests prove no Phase 4 record mutation across all adapters |
| Deterministic identities | Canonical serialization changes cause duplicates/collisions | Medium | High | Pin encoding/hash/version; golden vectors; collision and upgrade policy | Platform Lead | P0 | Golden vectors stable across runtimes; upgrade creates separate namespace |
| Provenance graph | Derived claims lose evidence lineage | Medium | High | Required provenance fields; acceptance validator; graph completeness audit | Analysis Intelligence Lead | P0 | 100% material assertions in acceptance corpus have valid provenance |
| Publisher reputation | Score encodes bias or becomes authorization | Medium | High | Component display, uncertainty, minimum samples, policy review, no automatic trust changes | Source Intelligence Lead | P0 | Authorization isolation tests pass; cohort/fairness review approved |
| Reliability history | Platform/model failures are blamed on publisher | Medium | Medium | Typed attribution, unknown category, version annotations, exclusion policy | Source Intelligence Lead | P1 | Labeled failure-attribution corpus meets accepted precision |
| Exact duplicate detection | Hash/normalization falsely equates distinct content | Low | High | Conservative identity normalization, multi-signal conflicts, retain records | Source Intelligence Lead | P0 | At least 99.9% precision and zero critical false merge in corpus |
| Near-duplicate detection | Distinct updates or perspectives are suppressed | Medium | High | High precision threshold, novelty/conflict checks, reversible view suppression | Source Intelligence Lead | P0 | At least 98% precision; all seeded updates/conflicts remain visible |
| Language detection | Unsupported/mixed content is misrouted | Medium | Medium | Confidence/unknown/mixed states, per-language evaluation, no source mutation | Source Intelligence Lead | P1 | Macro F1 at least 0.97 for supported languages; uncertain path verified |
| Publisher clustering | Common-origin inference labels unrelated publishers or coordination | Medium | High | Explainable edges, neutral terminology, confidence, human adjudication | Source Intelligence Lead | P1 | Cluster precision threshold and policy/legal review pass |
| Source fingerprinting | Fingerprints leak or enable reidentification | Low | High | Classify inputs, prohibit short-text hashes, restricted access, log audit | Security Lead | P0 | Privacy threat model and telemetry scan pass |
| URL canonicalization | Different resources merge or credentials enter telemetry | Medium | High | Allowlisted params, publisher rules, preserve variants, URL sanitizer | Source Intelligence Lead | P0 | False-merge rate below 0.1%; adversarial URL privacy suite passes |
| Conflict detection | Apparent differences are mislabeled contradictions | Medium | Medium | Scope/time compatibility, discrepancy state, high precision, explanations | Analysis Intelligence Lead | P1 | Accepted contradiction precision at least 95% by cohort |
| Cross-source validation | Copied misinformation appears independently corroborated | High | High | Common-origin discounting, provenance, no majority truth rule | Analysis Intelligence Lead | P0 | Syndication/adversarial corpus does not inflate independence |
| Event extraction | Model invents event fields | Medium | High | Complete-object validation, field provenance, unknown states, bounded recovery | Analysis Intelligence Lead | P0 | Zero unsupported material fields in acceptance corpus |
| Entity resolution | Different entities are destructively merged | Medium | High | Conservative thresholds, conflicting fields fail merge, versioned split/merge | Analysis Intelligence Lead | P0 | False-merge rate below approved entity-type thresholds |
| Timeline generation | Imprecise or local times become false chronology | Medium | High | Preserve precision/timezone uncertainty, logical clocks, constraint conflicts | Analysis Intelligence Lead | P1 | All temporal edge cases retain precision and pass ordering fixtures |
| Confidence estimation | Score is uncalibrated or treated as truth | High | High | Labeled calibration, reliability diagrams, experimental label, component display | Data Science Lead | P1 | Calibration threshold and documentation approved per cohort |
| Coverage estimation | Source volume is mistaken for coverage | Medium | Medium | Independence, expected-field and perspective signals, separate confidence | Editorial Intelligence Lead | P1 | Syndication does not increase coverage; labeled rubric agreement passes |
| Story grouping | Unrelated events merge into one Story | Medium | High | Conservative candidate/member separation, immutable versions, operator correction | Analysis Intelligence Lead | P0 | Story grouping precision at least 97%; split/merge tests pass |
| Novelty scoring | Repetition or wording changes appear novel | Medium | Medium | Fixed prior snapshot, claim-level comparison, syndication discount | Analysis Intelligence Lead | P1 | Labeled novelty corpus meets accepted precision and repeat determinism |
| Duplicate-story suppression | Unique coverage is hidden | Medium | High | Conflict/update/novelty vetoes, coverage view, reversible suppression | Editorial Intelligence Lead | P0 | All seeded unique/conflicting coverage remains accessible |
| Relationship graph | Bad edge propagates widely or query is unbounded | Medium | High | Edge provenance/confidence, versioning, bounded traversal, quotas | Platform Lead | P1 | Graph integrity and adversarial traversal tests pass |
| Multi-model compatibility | Provider fallback bypasses validator or budgets | Medium | High | Common task envelope/validator, explicit selection and ceilings | AI Platform Lead | P0 | Provider contract suite produces identical acceptance decisions |
| Story ranking | Hidden weights create editorial bias/feedback loops | High | High | Versioned policy, component explanations, shadow comparison, human authority | Editorial Policy Owner | P0 | Policy/fairness review and explanation-completeness gate pass |
| Breaking-news logic | False urgency or stale breaking labels | Medium | High | High precision, expiry/decay, corroboration/uncertainty, no auto-publication | Editorial Policy Owner | P0 | Precision and expiry targets pass; no notification/publication side effect |
| AI Radar summaries | Generated synthesis adds unsupported claims | Medium | High | Sentence/claim provenance, full validation, fail closed, human review | Editorial Intelligence Lead | P0 | Zero unsupported claims in acceptance corpus |
| Digest and weekly report | Cross-story synthesis conflates facts or periods | Medium | High | Fixed cutoffs, Story Version references, contradiction disclosure, validation | Editorial Intelligence Lead | P0 | Zero unsupported/conflated claims in acceptance corpus |
| Story lifecycle | Automatic state hides developing/disputed Story | Medium | Medium | Deterministic proposals, disputed visibility, reversible operator control | Editorial Policy Owner | P1 | Transition corpus passes and disputed Stories cannot be suppressed |
| Operational telemetry | Protected content or secrets enter events | Medium | High | Allowlists, bounded fields, adversarial privacy tests, sensitive-data alert | Security Lead | P0 | Zero forbidden content in test/shadow telemetry audit |
| Gemini usage/cost dashboard | Incomplete tokens produce misleading cost | High | Medium | Accounting coverage, price-table version, estimated label, invoice reconciliation | Operations Lead | P1 | Dashboard exposes coverage and reconciles within accepted tolerance |
| Pipeline/queue dashboards | Incorrect aggregation hides backlog or failure | Medium | High | Idempotent projection, state reconciliation, completeness alerts | Operations Lead | P1 | Fixture and sampled production reconciliation meet tolerance |
| Operator-action metrics | Metrics expose identity or incentivize harmful evaluation | Medium | High | Pseudonymization, restricted audit view, context and governance | Security Lead | P1 | Privacy/HR/legal review and access tests pass |
| Trend monitoring | Alert noise creates fatigue or misses drift | High | Medium | Minimum samples, baselines, owners, cooldowns, shadow alerts | Operations Lead | P2 | Alert precision/runbook exercise meets accepted target |
| Replay simulator | Sanitized fixtures leak data or contact production | Low | High | Isolation, fixture review, deny production credentials/network | Reliability Lead | P0 | Automated isolation and privacy tests prove production unreachable |
| Fault injection | Injector activates in production | Low | High | Build/runtime guards, separate identity, network denial, kill switch | Reliability Lead | P0 | Independent security test proves production injection impossible |
| Synthetic canaries | Canary publishes or pollutes business metrics | Low | High | No approval capability, synthetic labels, metrics exclusion, bounded catalog | Reliability Lead | P0 | Authorization tests and metric-exclusion reconciliation pass |
| Load testing | Test exhausts shared quotas or affects production | Low | High | Isolated project/quotas, scheduling, hard concurrency/cost caps | Reliability Lead | P0 | Environment isolation and stop-control rehearsal pass |
| Performance regression | Noisy baseline blocks releases or misses regression | Medium | Medium | Repeated trials, pinned environment, noise-aware thresholds | Reliability Lead | P2 | Baseline variance and seeded regression detection approved |
| Long-running validation | Soak test misses slow state/cardinality growth | Medium | Medium | Representative duration, periodic state sampling, resource budgets | Reliability Lead | P2 | Accepted soak interval passes without unbounded growth |
| Capacity planning | Forecast omits human review or provider quota | Medium | High | End-to-end model including operators, quotas, degraded modes, headroom | Operations Lead | P1 | Peak plan demonstrates agreed headroom and queue recovery |
| Disaster recovery | Restore produces inconsistent authority/derived state | Medium | High | Tiered restore order, integrity checks, rebuild derived state last | Incident Commander | P0 | Tabletop and isolated restore meet accepted RTO/RPO and invariants |
| Feature controls | Mismanaged activation creates mixed incompatible versions | Medium | High | Version compatibility matrix, change control, captured flags, rollback runbook | Release Manager | P0 | Canary proves controlled activation and rollback without data mutation |

## Risk ID registry and Phase 5.1 classification

Owner labels in the original register are implementation-domain roles. For Phase 5.0 governance, their accountable role mapping follows `PHASE_5_OWNERSHIP_MATRIX.md`.

| Risk ID | Canonical risk name | Phase 5.1 classification | Governance owner |
|---|---|---|---|
| P5-RISK-001 | Derived artifact platform | mitigated non-blocking for offline 5.1; completion evidence required | Architecture Owner |
| P5-RISK-002 | Deterministic identities | mitigated non-blocking for offline 5.1; completion evidence required | Architecture Owner |
| P5-RISK-003 | Provenance graph | mitigated non-blocking for offline 5.1; completion evidence required | Architecture Owner |
| P5-RISK-004 | Publisher reputation | non-blocking; implementation excluded | Product and Editorial Owner |
| P5-RISK-005 | Reliability history | deferred outside milestone | Data Governance Owner |
| P5-RISK-006 | Exact duplicate detection | mitigated non-blocking for offline 5.1; completion evidence required | Architecture Owner |
| P5-RISK-007 | Near-duplicate detection | deferred outside milestone | Evaluation Owner |
| P5-RISK-008 | Language detection | deferred outside milestone | Evaluation Owner |
| P5-RISK-009 | Publisher clustering | deferred outside milestone | Data Governance Owner |
| P5-RISK-010 | Source fingerprinting | mitigated non-blocking for offline 5.1; completion evidence required | Security and Privacy Owner |
| P5-RISK-011 | URL canonicalization | mitigated non-blocking for offline 5.1; completion evidence required | Architecture Owner |
| P5-RISK-012 | Conflict detection | deferred outside milestone | Evaluation Owner |
| P5-RISK-013 | Cross-source validation | deferred outside milestone | Architecture Owner |
| P5-RISK-014 | Event extraction | deferred outside milestone | Architecture Owner |
| P5-RISK-015 | Entity resolution | deferred outside milestone | Architecture Owner |
| P5-RISK-016 | Timeline generation | deferred outside milestone | Architecture Owner |
| P5-RISK-017 | Confidence estimation | deferred outside milestone | Evaluation Owner |
| P5-RISK-018 | Coverage estimation | deferred outside milestone | Evaluation Owner |
| P5-RISK-019 | Story grouping | deferred outside milestone | Architecture Owner |
| P5-RISK-020 | Novelty scoring | deferred outside milestone | Evaluation Owner |
| P5-RISK-021 | Duplicate-story suppression | deferred outside milestone | Product and Editorial Owner |
| P5-RISK-022 | Relationship graph | deferred outside milestone | Architecture Owner |
| P5-RISK-023 | Multi-model compatibility | deferred outside milestone | Architecture Owner |
| P5-RISK-024 | Story ranking | deferred outside milestone | Product and Editorial Owner |
| P5-RISK-025 | Breaking-news logic | deferred outside milestone | Product and Editorial Owner |
| P5-RISK-026 | AI Radar summaries | deferred outside milestone | Product and Editorial Owner |
| P5-RISK-027 | Digest and weekly report | deferred outside milestone | Product and Editorial Owner |
| P5-RISK-028 | Story lifecycle | deferred outside milestone | Product and Editorial Owner |
| P5-RISK-029 | Operational telemetry | mitigated non-blocking for test-local diagnostics; completion evidence required | Security and Privacy Owner |
| P5-RISK-030 | Gemini usage/cost dashboard | deferred outside milestone | Operations Owner |
| P5-RISK-031 | Pipeline/queue dashboards | deferred outside milestone | Operations Owner |
| P5-RISK-032 | Operator-action metrics | deferred outside milestone | Security and Privacy Owner |
| P5-RISK-033 | Trend monitoring | deferred outside milestone | Operations Owner |
| P5-RISK-034 | Replay simulator | mitigated non-blocking for offline harness; enforcement evidence required during 5.1A | Reliability Owner |
| P5-RISK-035 | Fault injection | deferred outside milestone | Reliability Owner |
| P5-RISK-036 | Synthetic canaries | deferred outside milestone | Reliability Owner |
| P5-RISK-037 | Load testing | deferred outside milestone | Reliability Owner |
| P5-RISK-038 | Performance regression | non-blocking for entry; completion evidence required | Reliability Owner |
| P5-RISK-039 | Long-running validation | deferred outside milestone | Reliability Owner |
| P5-RISK-040 | Capacity planning | non-blocking for offline foundation; future production blocker | Operations Owner |
| P5-RISK-041 | Disaster recovery | deferred outside milestone | Reliability Owner |
| P5-RISK-042 | Feature controls | non-blocking because no feature flag or production activation is authorized | Operations Owner |

## Milestone 5.1 Entry Risk Review

These risks remain open but no longer block writing isolated offline code. Their exit evidence is logically produced during 5.1A/5.1B and remains blocking for sub-slice progression or milestone completion as specified in `PHASE_5_1_GATE_TIMING_MATRIX.md`.

| Risk ID | Entry classification | Owner | Required exit evidence | Evidence now |
|---|---|---|---|---|
| P5-RISK-001 | MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1 | Architecture Owner | Contract/dependency tests proving Phase 4 records and namespaces are untouched | Compatibility and module-isolation design |
| P5-RISK-002 | MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1 | Architecture Owner | Cross-runtime golden vectors and version/namespace separation tests | Encoding and benchmark policy |
| P5-RISK-003 | MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1 | Architecture Owner | 100% provenance validation with negative fixtures | Provenance contract and 5.1A boundary |
| P5-RISK-006 | MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1 | Architecture Owner | 100% precision and zero critical false merges | Approved numeric corpus composition; corpus absent |
| P5-RISK-010 | MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1 | Security and Privacy Owner | Golden vectors, zero observed collisions, input/privacy audit | Fingerprint/privacy/isolation contracts |
| P5-RISK-011 | MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1 | Architecture Owner | 100% rule correctness and zero false equivalence | Approved URL corpus composition; corpus absent |
| P5-RISK-029 | MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1 | Security and Privacy Owner | Zero prohibited fields in adversarial serialization tests | Offline allowlist and size/retention budgets |
| P5-RISK-034 | MITIGATED_NON_BLOCKING_FOR_OFFLINE_5_1 | Reliability Owner | No-network/provider/repository/auth/import capability tests | Repository-backed `ISOLATION_FEASIBLE_WITH_LIMITATIONS` |

No risk is closed. Detailed residual uncertainty and timing are recorded in `PHASE_5_ENTRY_RISK_RESOLUTION.md`.

## Review cadence

- P0 risks: review at every implementation slice and release gate.
- P1 risks: review at milestone contract, shadow, and activation gates.
- P2/P3 risks: review at least once per milestone or when evidence changes.
- Any new capability requires a risk row before implementation.
- A risk exits only with cited evidence; mitigation implementation alone is insufficient.
