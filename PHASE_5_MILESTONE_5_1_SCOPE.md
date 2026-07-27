# Phase 5.1 Deterministic Source Intelligence Foundation Scope

## Authorization status

- Scope boundary: Approved
- Execution authorization: Withheld while `PHASE_5_ENTRY_GATE.md` is `NOT_READY`
- Approved date: 2026-07-27
- Baseline: `v1.0.0-rc1`
- Implementation status: Not started
- Deployment authorization: None

This document defines the smallest safe implementation scope that may be authorized after the entry blockers are resolved. It does not itself authorize implementation or production behavior.

## Purpose

Create deterministic offline foundations for later Source Intelligence without adding production dependencies, writes, model calls, ranking, reputation behavior, user interface, or deployment.

## IN_SCOPE

After the entry gate opens, the implementation scope is limited to:

- source normalization contract tests over synthetic or approved corpus fixtures;
- a pure, versioned normalization library that does not alter existing Phase 4 normalization;
- conservative canonical URL normalization under approved allowlisted rules;
- deterministic source fingerprinting using COMP-ID-007;
- versioned derived-artifact envelope structures;
- immutable provenance structures and completeness validation;
- an offline deterministic corpus manifest/harness;
- test-local bounded diagnostics under the privacy/telemetry allowlist;
- Phase 4 compatibility regression tests;
- documentation generated from or validating the contracts where appropriate.

## OUT_OF_SCOPE

- production writes or reads introduced for Phase 5;
- Firestore adapters, collections, documents, indexes, or transactions;
- schemas or migrations for production persistence;
- model or Gemini calls;
- prompts or provider adapters;
- near-duplicate classification;
- language detection implementation;
- publisher clustering;
- source reputation calculation or publisher trust changes;
- cross-source validation or contradiction detection;
- story/entity identity implementation;
- ranking, priority, or editorial scoring;
- duplicate suppression in production or operator views;
- UI or API routes;
- feature-flag changes or new active production flags;
- deployment, traffic, IAM, secret, or authentication changes;
- replay/fault-injection endpoints;
- approval, review, publication, or operator-workflow changes.

## FUTURE_SCOPE

Requires a later gate and any deferred ADR acceptance:

- governed corpus expansion and language cohorts;
- exact/near-duplicate classifiers beyond deterministic identity fixtures;
- language detection;
- publisher/common-origin clustering;
- advisory source reputation;
- production shadow processors and persistence;
- model-assisted features and embeddings;
- Story and Entity identities;
- operator-facing explanations;
- production telemetry and dashboards;
- reliability fault injection, load testing, and disaster recovery.

## Entry prerequisites

- Repository remains on the authorized implementation branch descended from the blueprint/gate commits.
- `PHASE_5_ENTRY_GATE.md` is reassessed to `READY_FOR_IMPLEMENTATION` or `READY_WITH_NON_BLOCKING_LIMITATIONS`.
- P5-ADR-001, 002, 003, 005, 006, 010, 012, and 013 retain accepted status within their limitations.
- Owners remain assigned by role.
- Compatibility and privacy contracts remain approved.
- `THR-LAT-001` and `THR-COST-002` are resolved with justified entry budgets.
- P5-RISK-001, P5-RISK-002, P5-RISK-003, P5-RISK-006, P5-RISK-010, P5-RISK-011, P5-RISK-029, and P5-RISK-034 have approved entry evidence or are explicitly reclassified with evidence.
- Implementation plan identifies pure-module boundaries and proves no production repository dependency.

## Implementation outputs

- Pure normalization/canonical URL/fingerprint modules.
- Versioned envelope and provenance types/validators.
- Governed corpus schema, manifest, checksum, and partition tooling.
- Synthetic development fixtures and approved corpus metadata.
- Deterministic unit, property, golden-vector, compatibility, privacy, and isolation tests.
- Bounded test-local evaluation report.
- Updated gate evidence for milestone completion.

These outputs are planned, not currently implemented.

## Expected tests

- normalization idempotence and supported-equivalence cases;
- Unicode NFC/NFKC distinction;
- locale-independent ordering/comparison;
- URL host/scheme/default-port/dot-segment/fragment/trailing-slash rules;
- allowlisted tracking versus meaningful query parameters;
- canonicalization idempotence and false-merge traps;
- source fingerprint golden vectors across runtimes;
- length framing, namespace, and version separation;
- artifact unknown-version rejection;
- provenance completeness and immutability;
- manifest/checksum reproducibility;
- allowlist/denylist telemetry;
- no network, model, Firestore, approval, publication, or production adapter capability;
- full Phase 4 regression suite.

## Evaluation method

1. Pin runtime, logical clock, algorithm, normalization, schema, and corpus versions.
2. Execute development fixtures during implementation.
3. Tune rules only on development/validation partitions.
4. Seal and execute holdout once for the completion gate.
5. Report every threshold by ID, sample count, and confidence/uncertainty where applicable.
6. Treat any hard-invariant violation as failure.
7. Repeat the full deterministic run at least twice and compare result manifests.

No model or semantic classifier participates.

## Rollback boundary

- Before implementation: discard/revise documentation through normal review.
- During implementation: revert only Phase 5.1 pure modules/tests and corpus tooling.
- No production rollback is needed because production writes, deployment, UI, routes, flags, and consumers are prohibited.
- Preserve failing synthetic fixtures and bounded reports.
- Baseline Phase 4 code and records remain untouched.

## Feature-flag strategy

No production feature flag is created, changed, or activated. Offline code is unreachable from production entry points. Any future production shadow integration requires a separate accepted ADR/release authorization and a dedicated rollback control.

## Data-writing prohibition

- No Firestore or production datastore writes.
- No production reads added for Phase 5.
- Test output is limited to in-memory or ephemeral test directories under the approved harness.
- Corpus files, when later created, require governance approval and are not production records.

## Deployment prohibition

No container build release, revision, deployment, traffic change, IAM/secret change, or hosted execution is authorized by Phase 5.1 foundation work.

## Completion criteria

- All scope outputs exist and remain isolated.
- Full application validation passes.
- All Phase 5.1 completion-blocking thresholds pass on an approved corpus version.
- No hard-invariant violation occurs.
- All relevant P0 risk exit evidence is documented.
- Documentation and implementation match.
- A completion gate explicitly decides whether any later shadow proposal may be designed.

Completion does not authorize production deployment or milestone 5.2.
