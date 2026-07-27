# Phase 5 Compatibility Contracts

## Status and authority

- Status: Approved for deterministic offline Phase 5.1 implementation
- Approval date: 2026-07-27
- Baseline: `v1.0.0-rc1`
- Baseline commit: `1ea50f5f01a8cd08481578cadc85ffff08eecf26`
- Accountable owner: Architecture Owner
- Review roles: Security and Privacy Owner; Data Governance Owner; Evaluation Owner

These contracts are implementation constraints. They do not authorize production persistence, schema changes, migrations, deployment, feature activation, model calls, approval, or publication.

## Severity scale

- **Critical:** Could weaken evidence, authorize/publish, corrupt authoritative state, expose protected data, or destroy information. Blocks implementation/release.
- **High:** Breaks identity, provenance, backward reading, deterministic behavior, or rollback. Blocks the affected milestone.
- **Medium:** Reduces evaluation quality without violating an authoritative record. Must be corrected before milestone completion.

## A. Phase 4 write-path protection

| Contract ID | Invariant | Enforcement point | Validation strategy | Severity | Rollback expectation |
|---|---|---|---|---|---|
| COMP-P4-001 | Phase 5 must not alter Phase 4 analysis, review, approval, or publication transaction behavior without a separately accepted ADR and release authorization. | Module/repository dependency boundary | Dependency and mutation tests; commit-scope review | Critical | Remove/disable Phase 5 caller; baseline path remains authoritative |
| COMP-P4-002 | Existing Phase 4 IDs remain authoritative: `analysis-${processingRunId}`, `review-${analysisId}`, and `radar-${analysisId}`. | Identity namespace validator | Golden ID vectors and collision tests | Critical | Reject Phase 5 artifact and revert its namespace version |
| COMP-P4-003 | Existing published `RadarItem` records remain readable without Phase 5 data. | Readers and serializers | Baseline fixture read tests with no Phase 5 fields | Critical | Fall back to v1.0.0-rc1 reader |
| COMP-P4-004 | Pending and rejected reviews remain unpublished. | Review/publication boundary | State-transition regression tests | Critical | Isolate Phase 5; use existing transaction only |
| COMP-P4-005 | Human approval remains mandatory. | Authorization and publication transaction | Negative authority tests | Critical | Disable Phase 5 integration immediately |
| COMP-P4-006 | A Phase 5 failure cannot rewrite Phase 4 validation outcome or create a replacement processing run. | Phase 5 adapter boundary | Failure-injection contract tests | Critical | Drop derived attempt; preserve Phase 4 state |

## B. Evidence integrity

| Contract ID | Invariant | Enforcement point | Validation strategy | Severity | Rollback expectation |
|---|---|---|---|---|---|
| COMP-EVID-001 | Evidence is an exact contiguous substring after Unicode NFC and deterministic whitespace normalization only. | Existing evidence validator; Phase 5 validators | Frozen evidence regression corpus | Critical | Reject derived artifact; do not repair evidence |
| COMP-EVID-002 | Fuzzy or semantic acceptance is prohibited. | Validator configuration and code review | Negative paraphrase/similarity tests | Critical | Remove offending path and reject affected artifacts |
| COMP-EVID-003 | Case-insensitive or punctuation-insensitive acceptance is prohibited. | Evidence validator | Case/punctuation negative fixtures | Critical | Reject artifact |
| COMP-EVID-004 | Closest-sentence substitution is prohibited. | Recovery/validation boundary | Missing-quote negative fixtures | Critical | Fail closed |
| COMP-EVID-005 | Automatic evidence replacement or repair is prohibited. | Recovery decision table | Mutation and replacement absence tests | Critical | Discard only the invalid derived result; retain source |
| COMP-EVID-006 | NFKC compatibility collapsing is prohibited for evidence acceptance. | Normalization boundary | NFC/NFKC distinction fixtures | Critical | Reject artifact |

## C. Advisory boundary

| Contract ID | Invariant | Enforcement point | Validation strategy | Severity | Rollback expectation |
|---|---|---|---|---|---|
| COMP-ADV-001 | Scores, groups, reputations, clusters, recommendations, and confidence values are advisory. | Artifact schema and consumers | Authority-capability tests | Critical | Hide/disable advisory reader |
| COMP-ADV-002 | Phase 5 cannot approve. | Repository and service capabilities | Compile-time/interface and runtime negative tests | Critical | Isolate Phase 5 identity/caller |
| COMP-ADV-003 | Phase 5 cannot publish. | Repository and service capabilities | Publication-call absence and authorization tests | Critical | Roll back integration; inspect audit trail |
| COMP-ADV-004 | Phase 5 cannot rewrite accepted Phase 4 evidence. | Artifact/reference model | Immutability tests | Critical | Reject artifact/version |
| COMP-ADV-005 | Publisher trust remains operator-controlled; source reputation cannot change it. | Registry boundary | Trust-state mutation tests | Critical | Disable reputation consumer |

## D. Data compatibility

| Contract ID | Invariant | Enforcement point | Validation strategy | Severity | Rollback expectation |
|---|---|---|---|---|---|
| COMP-DATA-001 | New fields are additive and namespaced/versioned; required baseline fields are unchanged. | Schema review | Old/new fixture compatibility tests | High | Readers ignore unsupported optional Phase 5 fields |
| COMP-DATA-002 | New fields are optional to baseline readers and cannot change baseline defaults. | Serializer/reader | Absence/presence matrix | High | Omit Phase 5 projection |
| COMP-DATA-003 | Every derived artifact carries schema, algorithm, and input-version references. | Artifact envelope validator | Required-field and version tests | High | Reject incomplete artifact |
| COMP-DATA-004 | Provenance is immutable and complete for all derived inputs and transformations. | Provenance validator | Missing/mutated reference tests | Critical | Reject artifact |
| COMP-DATA-005 | Baseline records remain readable without Phase 5 services or artifacts. | Repository/read boundary | v1 fixtures against current readers | Critical | Disable Phase 5 readers |
| COMP-DATA-006 | No destructive migration is allowed by default; this scope authorizes none. | Migration/release review | Changed-file and migration-directory audit | Critical | Stop release; revert unauthorized migration |
| COMP-DATA-007 | Duplicate suppression cannot delete source, analysis, review, publication, evidence, or derived provenance. | Projection boundary | Retention and visibility tests | Critical | Ignore suppression projection |
| COMP-DATA-008 | Corrections append a new version with `supersedes`; they do not mutate accepted history. | Artifact version writer, when later authorized | Correction chain fixtures | High | Read last accepted compatible version |
| COMP-DATA-009 | Unknown artifact versions fail closed for processing and are ignored safely by baseline readers. | Decoder/validator | Future-version fixtures | High | Disable unsupported producer/reader |
| COMP-DATA-010 | Rollback readers tolerate all previously accepted artifact versions or explicitly deactivate them without deleting data. | Version resolver | Backward-version fixture matrix | High | Select last compatible version |

## E. Identity contracts

No new production identifier is implemented or persisted by this approval.

| Contract ID | Identity | Initial rule | Enforcement point | Validation strategy | Severity | Rollback expectation |
|---|---|---|---|---|---|---|
| COMP-ID-001 | Source definition | Existing repository ID remains authoritative; Phase 5 references it unchanged. | Reference validator | Existing-ID fixture tests | Critical | Reject unknown reference |
| COMP-ID-002 | Source record | Existing `SourceRecord.id` remains authoritative and immutable. | Reference validator | Immutable reference tests | Critical | Reject artifact |
| COMP-ID-003 | Processing run | Existing run ID remains authoritative; Phase 5 never creates a replacement for internal work. | Service boundary | No-new-run tests | Critical | Terminate derived work |
| COMP-ID-004 | Analysis | Existing `analysis-${processingRunId}` remains authoritative. | Namespace validator | Golden vector | Critical | Reject collision |
| COMP-ID-005 | Review | Existing `review-${analysisId}` remains authoritative. | Namespace validator | Golden vector | Critical | Reject collision |
| COMP-ID-006 | Publication | Existing `radar-${analysisId}` remains authoritative. | Namespace validator | Golden vector | Critical | Reject collision |
| COMP-ID-007 | Source fingerprint | Proposed offline format: `source-fingerprint:v1:<sha256>` where the digest is over a domain-separated, length-framed UTF-8 byte sequence containing normalization version and normalized payload. | Pure fingerprint function | Cross-runtime golden vectors and mutation tests | High | Stop using the fingerprint version |
| COMP-ID-008 | Story candidate | Deferred. Must use a separate namespace and ordered input/version framing; no production identity authorized. | Future ADR review | Future golden vectors | High | Not applicable to 5.1 |
| COMP-ID-009 | Story Version | Deferred. Must bind stable Story identity, sorted membership, logical cutoff, and algorithm version. | Future ADR review | Future lineage fixtures | High | Not applicable to 5.1 |
| COMP-ID-010 | Entity candidate | Deferred. Must not treat normalized name/type alone as identity and must retain alternatives/conflicts. | Future ADR review | Future false-merge corpus | Critical | Not applicable to 5.1 |

### Canonical byte framing for COMP-ID-007

The Phase 5.1 implementation proposal may encode each component as:

```text
UTF8("lafryhi-ai-radar")
0x00
UTF8("source-fingerprint")
0x00
UTF8("v1")
0x00
uint64_be(length(normalizationVersionBytes))
normalizationVersionBytes
uint64_be(length(normalizedPayloadBytes))
normalizedPayloadBytes
```

The output uses lower-case hexadecimal SHA-256. No locale-sensitive conversion is permitted. This fingerprint is an integrity and identity aid, not authorization. It must not be derived from short evidence quotes or emitted to unrestricted telemetry.

## F. Failure behavior

| Contract ID | Invariant | Enforcement point | Validation strategy | Severity | Rollback expectation |
|---|---|---|---|---|---|
| COMP-FAIL-001 | New-intelligence failures cannot corrupt or block Phase 4 unless a future accepted ADR explicitly authorizes synchronous dependency. | Asynchronous/offline boundary | Failure-isolation tests | Critical | Disable Phase 5 work |
| COMP-FAIL-002 | Offline and shadow failures remain isolated and cannot create production writes. | Environment/repository adapter | No-production-adapter tests | Critical | Stop harness |
| COMP-FAIL-003 | Unsupported artifact versions fail closed and produce bounded diagnostics. | Decoder and telemetry allowlist | Future/unknown version fixtures | High | Reject artifact/version |
| COMP-FAIL-004 | Invalid derived output is retained only under approved diagnostic policy and never promoted. | Evaluation harness | Invalid-result state tests | High | Remove from accepted output view, not source corpus |
| COMP-FAIL-005 | A contract violation is terminal for that derived artifact and cannot be repaired by destructive mutation. | Validator/decision table | Mutation-absence tests | Critical | Recompute only under a new version after correction |

## G. Language and Unicode compatibility

| Contract ID | Invariant | Enforcement point | Validation strategy | Severity | Rollback expectation |
|---|---|---|---|---|---|
| COMP-LANG-001 | Generic deterministic logic must preserve unevaluated Unicode languages under the approved transformation set without making accuracy claims. | Pure normalization boundary | Multiscript property fixtures | High | Disable the normalization version |
| COMP-LANG-002 | English, French, and Arabic are planned evaluated cohorts only after their labeled samples pass thresholds. | Corpus manifest/reporting | Cohort-count and label audit | High | Remove evaluated-support claim |
| COMP-LANG-003 | Case folding, diacritic removal, punctuation substitution, transliteration, tatweel removal, and presentation-form compatibility collapse are prohibited for exact identity. | Normalization validator | Language-specific negative fixtures | Critical | Reject artifact/version |
| COMP-LANG-004 | Phase 5 normalization cannot rewrite Phase 4 source text or accepted evidence. | Artifact/reference boundary | Immutability/evidence regression tests | Critical | Reject derived artifact |
| COMP-LANG-005 | Mixed/unevaluated languages are processed only as `UNEVALUATED_ALLOWED_WITHOUT_CLAIMS`. | Evaluation reporter | Claim/status fixtures | High | Remove unsupported claim |

## Compatibility validation gate

Phase 5.1 completion requires:

- all Critical invariants exercised by deterministic negative tests;
- backward reads over representative v1.0.0-rc1 fixtures;
- no production repository dependency;
- no writes outside test-local or ephemeral storage;
- exact evidence regression suite unchanged;
- no authorization capability in Phase 5 interfaces;
- a clean changed-file audit.

## Approval limitations

- The source-fingerprint encoding is approved for implementation and evaluation, not production persistence.
- Story and Entity identity rules remain deferred.
- No artifact storage schema or collection is approved.
- Any change to a Critical invariant requires a new or updated accepted ADR.
