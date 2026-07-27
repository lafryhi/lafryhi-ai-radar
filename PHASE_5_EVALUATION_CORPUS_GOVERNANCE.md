# Phase 5 Evaluation Corpus Governance

## Status

- Status: Approved governance design for Phase 5.1 corpus implementation
- Approval date: 2026-07-27
- Accountable owner: Data Governance Owner
- Responsible owner: Evaluation Owner
- Review roles: Security and Privacy Owner; Architecture Owner
- Corpus collection status: Not started
- Implementation status: Not started

This document authorizes creation of an offline governed corpus harness and approved samples during Phase 5.1. It does not authorize production data extraction, model training, production writes, or deployment.

## Purpose

The corpus provides deterministic, licensed, provenance-complete evidence for normalization, canonical URL, fingerprint, compatibility, and later duplicate/language evaluation. It prevents anecdotal thresholds and unrepeatable regression claims.

## Permitted source licensing categories

| Category | Permitted use |
|---|---|
| Purpose-built synthetic content | Preferred for edge, privacy, Unicode, URL, and adversarial fixtures |
| Public-domain content | Permitted with provenance and jurisdiction/license record |
| Openly licensed content | Permitted within license terms; store license identifier and attribution requirements |
| Publisher-provided test fixtures | Permitted under explicit recorded authorization |
| Internally authored fixtures | Permitted with authoring provenance |
| Production-derived content | Prohibited unless separately approved, minimized/sanitized, licensed, privacy-reviewed, and isolated |
| Scraped copyrighted content without evaluation rights | Prohibited |

No corpus license may be inferred from public accessibility alone.

## Provenance requirements

Every sample records:

- immutable sample ID;
- source/licensing category;
- license or authorization reference;
- acquisition/creation date;
- creator/curator role;
- content hash over the governed fixture;
- original format and encoding;
- language/script labels;
- category labels;
- annotation version;
- correction/supersession state;
- train/evaluation partition;
- privacy review state.

Reports reference sample IDs, not content.

## Immutable sample identifiers

Proposed form:

```text
p5-corpus:<corpus-major>:<category>:<opaque-sequence>
```

The ID never changes. A corrected fixture receives a new sample ID and a `supersedes` reference. Content hashes verify integrity but do not authorize use and are not logged outside the restricted corpus index.

## Corpus versioning

- Semantic version: major for incompatible composition/label policy; minor for additive samples/labels; patch for metadata correction without fixture/label meaning change.
- A corpus manifest lists sorted sample IDs, content checksums, annotation checksums, schema version, partition, and governance approval.
- Released corpus versions are immutable.
- Evaluation reports identify the exact manifest checksum.

## Annotation format

Each annotation is structured and schema-validated:

- task/category;
- label and allowed enum;
- compared sample IDs where applicable;
- field-level expected result;
- ambiguity flag;
- rationale code;
- annotator role;
- annotation timestamp;
- annotation schema version;
- adjudication state;
- supersedes reference.

Free-form rationale is restricted to the corpus repository and excluded from telemetry.

## Reviewer rules

- Initial annotation and adjudication are separate logical roles.
- The same project owner may perform both only if each role and pass is recorded separately.
- High-risk false-merge, privacy, license, and evidence fixtures require explicit second-pass review.
- Independent reviewer: Not currently assigned. This is non-blocking for synthetic/offline Phase 5.1 fixtures and blocking before production-derived fixtures or production activation.
- Reviewers must not see algorithm predictions before completing blind labels where feasible.

## Adjudication and disagreement

1. Preserve each original annotation.
2. Record disagreement category.
3. An Evaluation Owner proposes resolution using the label policy.
4. Data Governance accepts the adjudicated label or retains `ambiguous`.
5. Ambiguous samples are reported separately and cannot count as passing evidence for a blocking threshold unless the metric defines treatment in advance.
6. Never resolve disagreement by majority algorithm output.

Inter-reviewer agreement is reported for applicable tasks.

## Correction process

- Never overwrite a released fixture or label.
- Create a new sample/annotation version with `supersedes`.
- Record reason code: factual error, license change, privacy issue, label-policy change, encoding error, or duplicate sample.
- Re-run every report dependent on the superseded version.
- Security/privacy removal may restrict old content immediately while preserving non-content audit metadata.

## Train/evaluation separation

Phase 5.1 contains no model training. The separation is still mandatory:

- `development`: visible for implementation and debugging;
- `validation`: used for threshold tuning;
- `holdout`: sealed until gate evaluation;
- `adversarial`: maintained separately and rotated.

No sample may occupy more than one partition within a corpus major version. Near duplicates and variants must remain in the same partition to prevent leakage.

## Contamination prevention

- Do not include holdout content in prompts, documentation examples, golden test output, or developer debugging.
- Partition related/duplicate families together.
- Record all model/provider exposure if later used.
- Rotate holdout/adversarial samples after material leakage.
- Verify manifest membership and family grouping automatically.
- Do not tune thresholds on holdout results.

## Privacy exclusions

Exclude:

- credentials, tokens, cookies, secrets, authorization material;
- personal contact details unless purpose-built synthetic;
- private persons' sensitive data;
- unpublished editorial notes;
- raw model output from production;
- evidence quotes copied from production incidents;
- contractual or copyrighted content without evaluation rights.

Use synthetic markers for telemetry/privacy tests.

## Retention and deletion

- Synthetic/public-domain/open-license fixtures: retain while the supported algorithm version depends on them, subject to license.
- Publisher-provided fixtures: follow recorded agreement.
- Restricted/sanitized fixtures: retention must be approved before inclusion.
- Deletion removes content from future corpus versions and restricted storage under an auditable procedure.
- Preserve non-content tombstone metadata, reason, affected versions, and report invalidation.
- Never silently replace a deleted sample.

## Reproducibility and checksum requirements

- UTF-8 fixture encoding is explicit.
- Newline representation and archive format are pinned.
- Manifest order is Unicode code-point order over sample IDs.
- SHA-256 checksums cover each exact fixture byte stream, annotation, and final manifest.
- Toolchain, normalization, algorithm, logical clock, and seed versions are recorded.
- A released corpus is read-only.
- Two clean executions must produce identical classifications, IDs, and report data for deterministic algorithms.

Checksums are integrity tools, not authorization and not unrestricted diagnostic identifiers.

## Corpus-change approval

| Change | Required approval |
|---|---|
| Add synthetic development samples | Evaluation Owner |
| Add validation/holdout sample | Evaluation Owner and Data Governance Owner |
| Add production-derived/restricted sample | Security and Privacy Owner and Data Governance Owner; independent review required |
| Change label policy | Evaluation Owner, Product and Editorial Owner, Architecture Owner |
| Change partition | Data Governance Owner with contamination analysis |
| Delete/restrict sample | Data Governance Owner; Security and Privacy Owner when privacy-related |
| Release new major corpus | Data Governance Owner and Evaluation Owner |

## Minimum planned composition

The first corpus version must plan at least the following families. Numeric sample minima remain unresolved until licensing and language cohorts are approved; absence of a justified count is documented in `PHASE_5_ACCEPTANCE_THRESHOLDS.md`.

| Category | Required planned coverage |
|---|---|
| Exact duplicates | Byte-identical and identity-normalization-equivalent pairs |
| Near duplicates | Reworded/syndicated variants; implementation deferred |
| Unrelated articles | Hard lexical/entity overlap negatives |
| Syndicated articles | Same origin across publishers |
| Updated articles | Corrections and material/non-material updates |
| Multilingual content | Each approved language and script |
| Mixed-language content | Code-switching, quoted foreign text, insufficient text |
| Malformed HTML | Truncation, broken tags, invalid entities; extraction behavior remains out of Phase 5.1 |
| Boilerplate-heavy pages | Navigation/legal/template dominance |
| Contradictory sources | Compatible scope/time with conflicting claims |
| Common-event coverage | Independent articles about one event |
| Same publisher/different article | Shared template/byline/title patterns |
| Different publisher/same event | Independent and syndicated variants |
| False merge traps | Same title/name/topic but meaningfully distinct records |
| False split traps | URL/whitespace/encoding variants of the same record |
| Canonical URL variants | Scheme/host case, default port, dot segment, fragment, trailing slash policy |
| Tracking-parameter variants | Allowlisted tracking params versus meaningful query params |

## Corpus entry criteria for implementation

The Phase 5.1 implementation may begin with corpus schema/harness and synthetic development fixtures. Before evaluating milestone completion:

- corpus v1 composition counts must be approved;
- supported language cohort must be approved;
- validation and holdout partitions must exist;
- every fixture must pass license/provenance/privacy validation;
- manifest/checksum reproducibility must pass;
- blocking metrics must have sufficient labeled samples.

## Accepted limitations

- Corpus content is not collected in Phase 5.0.
- Minimum numeric composition and language cohorts are unresolved.
- This is non-blocking for building the offline corpus harness and pure contract tests, but blocking for claiming metric validation or completing Phase 5.1.
