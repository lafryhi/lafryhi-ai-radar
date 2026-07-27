# Phase 5.1C Governed Corpus Manifest Tooling Scope

## Authorization status

- Slice name: Phase 5.1C — Governed Corpus Manifest Tooling
- Scope status: Approved
- Implementation status: Authorized, not started
- Authorization date: 2026-07-27
- Implementation branch: `phase-5/source-intelligence-foundation`
- Authorization baseline: `fadac2e90b8f41d82eff683ed70583b3bfd2db27`
- Frozen compatibility baseline: `v1.0.0-rc1`
- Deployment authorization: None
- Phase 5.2 authorization: None

This is the smallest remaining offline implementation slice supported by the approved Phase 5.1 scope. It separates deterministic corpus-control tooling from corpus collection, qualification execution, independent review, and milestone closure.

## Authority

This slice is bounded by:

- [`PHASE_5_MILESTONE_5_1_SCOPE.md`](PHASE_5_MILESTONE_5_1_SCOPE.md), which includes governed corpus schema, manifest, checksum, and partition tooling;
- [`PHASE_5_EVALUATION_CORPUS_GOVERNANCE.md`](PHASE_5_EVALUATION_CORPUS_GOVERNANCE.md), which defines manifest, provenance, licensing, privacy, partition, sealing, integrity, and change-control rules;
- [`PHASE_5_INITIAL_CORPUS_COMPOSITION.md`](PHASE_5_INITIAL_CORPUS_COMPOSITION.md), which fixes the planned 240-document and 385-unit composition;
- [`PHASE_5_LANGUAGE_COHORT_POLICY.md`](PHASE_5_LANGUAGE_COHORT_POLICY.md), which fixes planned English, French, and Arabic cohort metadata without granting evaluated-support claims;
- [`PHASE_5_ACCEPTANCE_THRESHOLDS.md`](PHASE_5_ACCEPTANCE_THRESHOLDS.md), which defines reproducibility, integrity, privacy, compatibility, latency, resource, and regression gates;
- [`PHASE_5_ENTRY_MEASUREMENT_POLICY.md`](PHASE_5_ENTRY_MEASUREMENT_POLICY.md), which governs measurements;
- [`PHASE_5_1_GATE_TIMING_MATRIX.md`](PHASE_5_1_GATE_TIMING_MATRIX.md), which keeps full-corpus and milestone evidence completion-blocking rather than tooling-entry-blocking; and
- the accepted offline decisions and ownership boundaries in [`PHASE_5_ADR_ACCEPTANCE_RECORD.md`](PHASE_5_ADR_ACCEPTANCE_RECORD.md) and [`PHASE_5_OWNERSHIP_MATRIX.md`](PHASE_5_OWNERSHIP_MATRIX.md).

This document authorizes implementation of this slice only. It does not change or weaken any cited authority.

## Entry criteria

Entry is satisfied when:

- the branch descends from the Phase 5 blueprint, gate, 5.1A, and 5.1B commits;
- the entry gate remains `READY_WITH_NON_BLOCKING_LIMITATIONS`;
- Phase 5.1A and 5.1B validations remain passing;
- accepted offline ADRs and the Phase 5 compatibility/privacy contracts remain in force;
- `p5-corpus-v0-planned` composition and the language-cohort policy remain approved;
- the work remains pure, deterministic, offline, test-local, and isolated from production capabilities;
- the frozen production tag remains unchanged; and
- the worktree is clean before implementation.

No independent reviewer is required to begin this deterministic offline tooling slice. This does not waive independent review or an accepted renewed exception where the milestone completion gate requires it.

## In scope

- Versioned, strict corpus document, relationship-unit, annotation-reference, partition, and manifest contracts.
- Deterministic validation of immutable sample IDs, unit IDs, corpus/schema versions, and declared metadata.
- Exact-byte SHA-256 integrity digests for fixtures, annotations, and the final canonical manifest.
- Unicode code-point ordering of manifest sample and unit identifiers.
- Deterministic canonical manifest serialization with pinned UTF-8 and newline rules.
- Development, validation, and holdout partition declarations and validation.
- Duplicate/related-family co-location checks that reject cross-partition leakage.
- Seal-state metadata and rules that prevent mutation of sealed validation/holdout manifests.
- Composition accounting capable of proving unique-document, unit, category, and planned language-cohort counts without claiming those minima are already met.
- License, provenance, privacy, retention, and approval metadata validation.
- Bounded, allowlisted diagnostics that contain identifiers, rule/status codes, and counts only.
- Pure in-memory or ephemeral-test qualification interfaces needed to validate the tooling.
- Unit, negative, property-style, golden-vector, determinism, privacy, isolation, compatibility, and performance tests.
- A Phase 5.1C implementation report and continuity updates.

## Out of scope

- Collecting, downloading, copying, authoring, labeling, adjudicating, approving, or releasing the 240 documents or 385 evaluation units.
- Claiming the corpus, any partition, or any language cohort is complete, approved, released, sealed, or qualified.
- Executing the final validation or holdout qualification gate.
- Tuning on validation/holdout results or exposing holdout content.
- Language detection, near-duplicate classification, publisher clustering, reputation, corroboration, conflict analysis, or any Phase 5.2 behavior.
- Assigning or fabricating an independent reviewer, granting an exception, or closing the milestone review gate.
- Changing acceptance thresholds, corpus minima, label policy, ownership, or accepted ADR status.
- CI budget approval or recalibration beyond reporting local reference measurements for this slice.
- Production reads/writes, Firestore, routes, UI, model/provider calls, telemetry transports, feature flags, deployment, push, merge, traffic, IAM, secrets, tags, approval, or publication.
- Modification of Phase 4 behavior or completed Phase 5.1A/5.1B behavior.

## Deliverables

1. Pure versioned manifest and corpus-control contracts under the existing Phase 5 source-intelligence boundary.
2. Deterministic canonical serialization and SHA-256 integrity utilities.
3. Partition, family leakage, seal-state, composition, and governance-metadata validators.
4. Bounded validation result/report types with privacy-safe diagnostics.
5. Synthetic test fixtures only; no released qualification corpus content.
6. Focused automated tests and preserved import/prohibited-capability boundaries.
7. `PHASE_5_1C_IMPLEMENTATION_REPORT.md` recording implementation, commands, measurements, evidence, limitations, and remaining milestone work.
8. Updated execution and continuity state.

## Validation

The implementation must run:

- focused Phase 5.1C tests;
- all Phase 5.1A/5.1B regression tests;
- the complete repository test suite;
- lint;
- typecheck;
- the production build;
- import-boundary and prohibited-capability audits;
- privacy/diagnostic allowlist tests;
- at least two clean deterministic manifest runs with byte-identical output;
- golden checksum/serialization vectors;
- negative tests for invalid metadata, duplicate IDs, checksum mismatch, ordering drift, partition leakage, and sealed-manifest mutation; and
- Markdown structure, internal link, and `git diff --check` validation.

Measurements must follow [`PHASE_5_ENTRY_MEASUREMENT_POLICY.md`](PHASE_5_ENTRY_MEASUREMENT_POLICY.md). Do not report p95 from an inadequate sample count.

## Acceptance thresholds

This slice passes only when:

- canonical manifest output and digests are byte-identical across repeated unchanged runs;
- all valid synthetic fixtures are accepted and every seeded invalid fixture is rejected with the expected bounded code;
- identifier uniqueness, declared referential integrity, and required governance metadata validation are 100%;
- every seeded cross-partition family leak and sealed-manifest mutation is rejected;
- prohibited diagnostic fields and content leakage are zero;
- persistent qualification artifacts and logs remain within `THR-COST-002`;
- applicable local operation/corpus-tooling measurements remain within `THR-LAT-001`, explicitly provisional for CI;
- Phase 4, Phase 5.1A, and Phase 5.1B regressions are zero;
- no prohibited dependency or capability becomes reachable; and
- full project validation passes.

The 240-document, 385-unit, language-cohort, false-merge/split, full-corpus latency, and milestone-review thresholds are not satisfied by tooling alone. They remain completion-blocking for later evidence.

## Milestone closure rules

Completing Phase 5.1C qualifies only the manifest-tooling slice. It does not complete Phase 5.1.

Phase 5.1 remains open until a later explicitly authorized package:

- assembles and obtains required approvals for the complete governed corpus;
- seals approved validation and holdout partitions;
- proves all composition and language-cohort minima;
- executes every completion-blocking threshold on the exact released corpus;
- recalibrates provisional budgets on an approved CI reference run;
- records real independent review or an accepted renewed exception where required;
- resolves applicable P0 exit evidence; and
- produces an explicit Phase 5.1 milestone gate decision.

Milestone closure does not authorize production integration, deployment, or Phase 5.2.

## Rollback

Revert only Phase 5.1C pure modules, tests, synthetic fixtures, and its implementation report. Preserve failing fixtures and evidence needed to explain a rejected gate. No production rollback is required because production capabilities remain unreachable.

## Expected completion

- Expected commit message: `feat: add governed Phase 5.1 corpus manifest tooling`
- Expected slice classification: `PHASE_5_1C_TOOLING_COMPLETE`
- Expected milestone classification: `PHASE_5_1_QUALIFICATION_PENDING`
