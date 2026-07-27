# Phase 5.1B Deterministic Source Utilities Implementation Report

## Outcome

- Implementation date: 2026-07-27
- Starting commit: `e98bf4b3f598713c0c6c0977049df52cfcff4f4a`
- Completion classification: `COMPLETE_WITH_NON_BLOCKING_LIMITATIONS`
- Qualification label: `DEVELOPMENT QUALIFICATION ONLY`
- Production integration: Not implemented or authorized
- Complete Phase 5.1 milestone qualification: Not yet achieved

## Objective and implemented scope

Phase 5.1B implements deterministic offline source utilities and an in-memory development qualification harness:

- conservative canonical URL normalization;
- versioned Unicode-safe source-content normalization;
- domain-separated SHA-256 fingerprints;
- advisory exact-duplicate classification;
- 41 synthetic development fixtures;
- bounded in-memory qualification reports;
- isolation, privacy, determinism, and latency tests.

It adds no routes, services, persistence adapters, production consumers, models, telemetry transports, feature flags, or destructive behavior.

## Module tree

```text
src/domain/phase5/source-intelligence/
|-- artifact-envelope.ts
|-- canonical-url.ts
|-- contracts.test.ts
|-- exact-duplicate.ts
|-- identifiers.ts
|-- import-boundary.test.ts
|-- index.ts
|-- performance.test.ts
|-- provenance.ts
|-- qualification.ts
|-- source-fingerprint.ts
|-- source-normalization.ts
|-- source-utilities.test.ts
|-- utc-time.ts
`-- validation-error.ts

src/test/phase5/
`-- source-intelligence-fixtures.ts
```

## Canonical URL policy

Version: `phase5-canonical-url-v1`.

Implemented rules:

- accepts absolute HTTP and HTTPS URLs only;
- rejects malformed input, unsupported schemes, embedded credentials, controls, missing hosts, and input over 4,096 characters;
- uses the standard URL parser for host IDNA serialization and safe dot-segment resolution;
- lowercases scheme/host through standard serialization;
- removes HTTP port 80 and HTTPS port 443 while retaining non-default ports;
- removes fragments and records the decision;
- converts an empty path to `/`;
- preserves path case, reserved encoding semantics, trailing slashes, HTTP/HTTPS distinction, `www`, mobile/AMP paths, and non-default ports;
- removes only exact case-insensitive matches from the approved tracking allowlist;
- retains unknown and meaningful query parameters;
- sorts retained parameter names by binary/code-point order and preserves original order among duplicate names.

Approved removed names:

`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `utm_id`, `gclid`, `dclid`, `fbclid`, `msclkid`, `mc_cid`, and `mc_eid`.

No network canonical link, redirect, publisher-specific, mobile, AMP, `www`, scheme-merging, or shortest-URL inference exists.

## Source normalization policy

Version: `phase5-source-normalization-v1`.

The normalizer:

- requires explicit artifact ID, provenance, and caller-supplied UTC timestamp;
- accepts bounded title/body and optional author, publication-time text, language hint, and source URL reference;
- applies NFC, deterministic line-ending conversion, forbidden-control removal, horizontal-whitespace collapse, bounded newline collapse, and outer whitespace removal;
- preserves punctuation, case, letters, diacritics, apostrophes, dashes, compatibility characters, script changes, and word order;
- emits separate display-preserving, comparison, and digest-input representations;
- never translates, transliterates, stems, summarizes, repairs spelling, removes stop words, or infers text;
- returns `INSUFFICIENT_CONTENT` when both title and body normalize to empty;
- rejects bodies over 2 MiB.

The comparison representation uses locale-independent Unicode lowercase only and is not used for exact identity, evidence validation, or fingerprints. Digest input uses the case- and punctuation-preserving display representation.

### Language behavior

- English: punctuation, case, and diacritics remain intact.
- French: accents, `œ`, straight apostrophes, and typographic apostrophes remain distinct except for NFC canonical equivalence.
- Arabic: letters, hamza forms, diacritics, tatweel, `ة`, `ه`, `ى`, `ي`, punctuation, and presentation-form compatibility distinctions are preserved.
- Mixed language: script transitions and bidirectional content are preserved without language inference or manual reordering.
- Unevaluated languages: generic Unicode-safe behavior is allowed without support claims.

These development fixtures do not establish evaluated real-world support for English, French, or Arabic.

## Fingerprint design

Version: `phase5-source-fingerprint-v1`; algorithm: SHA-256.

Types:

- `SourceUrlFingerprint`
- `SourceTitleFingerprint`
- `SourceBodyFingerprint`
- `SourceDocumentFingerprint`

Each digest uses a fixed `lafryhi` namespace, algorithm version, fingerprint-type domain separator, UTF-8 byte-length framing, and ordered fields. No timestamp, salt, key, randomness, environment value, or network input is included. The identifiers use the Phase 5.1A `source-fingerprint:v1:<digest>` contract.

Fingerprints are advisory integrity/duplicate inputs. They are not authorization, authentication, encryption, publisher proof, factual equivalence, or publication authority. Cryptographic collision probability is not claimed to be zero.

## Exact-duplicate classification

Algorithm version: `phase5-exact-duplicate-v1`.

Possible decisions:

- `EXACT_URL_DUPLICATE`
- `EXACT_TITLE_DUPLICATE`
- `EXACT_BODY_DUPLICATE`
- `EXACT_DOCUMENT_DUPLICATE`
- `NOT_EXACT_DUPLICATE`
- `INSUFFICIENT_INPUT`

Complete document equality takes precedence. A matching URL or title cannot override conflicting body/title fingerprints. Same-event or same-title records with different bodies remain distinct. Results are explicitly `advisoryOnly: true`; no record is suppressed, mutated, or deleted.

Near-duplicate detection, similarity, embeddings, token distance, clustering, and fuzzy matching are deferred.

## Fixture inventory

The development subset contains 41 fully synthetic fixtures:

- 18 URL fixtures;
- 12 source-normalization fixtures;
- 11 exact-duplicate fixtures.

Coverage includes tracking/meaningful/duplicate queries, fragments, ports, Unicode hosts/paths, dot segments, trailing slashes, malformed and credential-bearing URLs, English/French/Arabic/mixed text, NFC, whitespace, controls, empty content, exact documents, same-URL conflicts, same-body/different-URL, false-merge traps, and false-split traps.

This subset is not the governed 240-document/385-unit corpus. It contains no real article, credential, personal data, or unpublished editorial content.

## Qualification harness

The harness is a pure in-memory evaluator. It accepts an explicit strict fixture set and invokes URL normalization, source normalization, fingerprints, and exact classification. Its bounded report contains fixture IDs, versions, counts, fixed check/status codes, and failures only. It contains no source body, full URL, credentials, secrets, model output, prompt, evidence quote, or production record.

Development results:

| Metric | Result |
|---|---:|
| Canonical URL expected outcomes | 18/18 |
| URL normalization idempotence | 12/12 accepted URLs |
| Source normalization idempotence | 12/12 |
| Fingerprint determinism | 11/11 |
| Exact-duplicate precision | 6/6, 100% |
| Exact-duplicate recall | 6/6, 100% |
| Provenance completeness | 23/23 derived results |
| Validation rejection correctness | 6/6 |
| Unexpected false merges | 0 |
| Unexpected false splits | 0 |
| Prohibited telemetry findings | 0 |
| Nondeterminism findings | 0 |

These are development-fixture results only and make no statistical or real-world accuracy claim.

## Performance and resources

Reference environment is the local Phase 5 entry environment recorded in `PHASE_5_ENTRY_BASELINE_MEASUREMENTS.md`.

Pure normalization-plus-body-fingerprint measurements used 100 warm-up calls followed by 1,000 timed observations per band in each of five separate processes:

| Band | Five process p95 values | Ceiling | Result |
|---|---|---:|---|
| ≤4 KiB | 0.106, 0.123, 0.285, 0.260, 0.409 ms | 2 ms | PASS |
| >4–256 KiB (64 KiB sample) | 0.590, 0.953, 1.789, 0.976, 1.678 ms | 10 ms | PASS |
| >256 KiB–2 MiB (512 KiB sample) | 14.423, 15.988, 22.047, 18.762, 19.575 ms | 50 ms | PASS |

One preliminary large-band run timed out at the test runner's former 5-second test timeout after measuring 12.221 ms p95. It was retained as a failed measurement attempt; the test timeout was raised to 30 seconds without changing the 50 ms per-operation ceiling, then five required process runs passed.

Qualification runner durations: 1,555; 1,435; 1,522; 1,455; and 2,167 ms. Median: 1,522 ms.

Focused test durations: 17,460; 18,080; 15,933; 15,860; and 16,429 ms. Median: 16,429 ms, below the 120-second incremental ceiling.

- Persistent generated qualification artifacts: 0 bytes
- Persistent diagnostic logs: 0 bytes
- External paid-service calls/cost: 0 / USD 0.00
- Firestore writes: 0
- Network calls: 0
- Peak RSS: not reported; Vitest worker aggregation was not reliably attributable to one process

## Privacy, security, and compatibility

- Production module enumeration covers every new pure module.
- Static audits prohibit production/service/repository/cloud/network/filesystem-write/auth/environment/telemetry dependencies.
- Static capability checks prohibit implicit clocks, randomness, console logging, process execution, secrets, and mutable `let`/`var` production state.
- URL errors expose only bounded issue code/path data.
- Qualification output passes the synthetic protected-content scan.
- Phase 4 evidence normalization and matching are untouched.
- Phase 5 normalization is not imported by Phase 4.
- Phase 5.1A contracts and all 19 original focused tests remain passing.

## Validation results

- Focused Phase 5.1A/5.1B tests: 41/41 across 4 files
- Full test suite: 231/231 across 22 files
- Lint: PASS with zero warnings
- Typecheck: PASS
- Production build: PASS
- Import-boundary audit: PASS
- Prohibited-capability audit: PASS
- Privacy/telemetry audit: PASS
- Deterministic-repeatability audit: PASS
- Documentation-link and reference audits: PASS
- `git diff --check`: PASS
- Phase 4 regression: PASS
- Phase 5.1A regression: PASS

## Known limitations and unresolved risks

- The full `p5-corpus-v0-planned` corpus does not exist.
- English, French, and Arabic have no real-world evaluated-support claim.
- The development subset is intentionally small and synthetic.
- Near-duplicate behavior is deferred.
- No independent reviewer is assigned.
- Per-operation results require later CI/runtime recalibration.
- URL normalization does not inspect canonical HTML or redirect chains.
- Generic URL parsing may evolve with the pinned Node runtime; golden vectors must remain enforced.
- Fingerprints of short title/body inputs remain restricted derived data and are never placed in the report.
- Production integration, telemetry, persistence, flags, and deployment remain unauthorized.

## Remaining requirements before complete Phase 5.1 qualification

- assemble and approve all 240 documents and 385 evaluation units;
- complete English/French/Arabic cohorts and sealed partitions;
- validate licensing, privacy, provenance, manifests, and checksums;
- execute completion-blocking thresholds on validation and holdout partitions;
- obtain required independent review or a renewed documented exception;
- recalibrate provisional budgets on the first CI reference run;
- complete the milestone gate without authorizing production.
