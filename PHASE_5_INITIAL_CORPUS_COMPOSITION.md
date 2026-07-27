# Phase 5.1 Initial Corpus Composition

## Approval record

- Corpus version: `p5-corpus-v0-planned`
- Composition status: Approved for implementation planning
- Corpus availability: Not created
- Approval date: 2026-07-27
- Accountable owner: Data Governance Owner
- Responsible owner: Evaluation Owner
- Purpose: Engineering qualification, not scientific generalization

This document approves numeric composition only. It does not collect, download, store, or license content.

## Counting rules

- A document has one immutable sample ID.
- A pair references two sample IDs.
- A group references at least three sample IDs unless stated otherwise.
- A variant set contains one asserted resource plus at least two representations.
- One document may participate in multiple labeled relationships, but each relationship counts once in its declared category.
- Category minima do not imply statistical confidence beyond this qualification corpus.

## Minimum composition

| Category ID | Category | Purpose | Minimum | Unit | Required labels | Expected decision | Gate status | Rationale | Licensing constraint | Privacy constraint |
|---|---|---|---:|---|---|---|---|---|---|---|
| CORP-EXACT-001 | Exact duplicates | Verify supported exact-equivalence rules | 40 | pair | exact-equivalent; normalization version | same exact identity | blocking completion | Strong positive identity coverage | Synthetic, public-domain, open-license, or explicitly authorized | No production evidence quotes or personal data |
| CORP-NEAR-001 | Near duplicates | Preserve future classifier cases without authorizing it | 30 | pair | near-duplicate subtype; material-difference flag | deferred classifier label | non-blocking for 5.1 | Prevent future corpus redesign | Same permitted categories | No unlicensed full text |
| CORP-UNREL-001 | Unrelated articles | Detect false matches under lexical/entity overlap | 50 | pair | unrelated; hard-negative subtype | distinct | blocking completion | Strong negative coverage | Same permitted categories | Minimize identifying details |
| CORP-SYND-001 | Syndicated articles | Distinguish common origin from independent reporting | 20 | pair | syndicated; origin relationship | related/common origin, not independent | non-blocking for deterministic utilities | Future-proof provenance | License must permit both fixtures | No inferred sensitive ownership claim |
| CORP-UPD-001 | Updated articles | Preserve corrections and material updates | 20 | pair | update type; material/non-material | distinct version relationship | blocking completion | Prevent false exact merge | Same permitted categories | No production incident excerpts |
| CORP-MULTI-001 | Evaluated language cohorts | Exercise English, French, and Arabic Unicode behavior | 90 | document | language, script, encoding | deterministic preservation under approved rules | blocking completion | 30 documents per approved cohort | Synthetic/open/public-domain/authorized | No personal contact data |
| CORP-MIXED-001 | Mixed-language content | Exercise mixed-script and code-switching behavior | 15 | document | primary/secondary language; scripts | process generically; no accuracy claim | blocking completion | Exposes unsafe language assumptions | Prefer synthetic | No real private-person content |
| CORP-HTML-001 | Malformed HTML | Preserve future extraction edge cases | 15 | document | malformed subtype | no extraction claim in 5.1 | non-blocking for 5.1 | Extraction remains out of scope | Prefer synthetic | No embedded secrets/trackers |
| CORP-BOILER-001 | Boilerplate-heavy pages | Detect template dominance in future work | 15 | document | boilerplate/content regions | no extraction claim in 5.1 | non-blocking for 5.1 | Future extraction qualification | Prefer synthetic | No copied site navigation requiring license |
| CORP-CONTRA-001 | Contradictory sources | Preserve opposing grounded claims | 10 | group | compatible scope/time; contradiction type | retain all; no truth decision | non-blocking for 5.1 | Future comparison safety | Synthetic/open/authorized | No defamatory real-person claims |
| CORP-EVENT-001 | Common-event multi-source coverage | Separate event relation from article identity | 10 | group | shared event; independence/common origin | distinct documents, related event | blocking completion | Prevent exact false merge | Same permitted categories | No unsupported sensitive event claims |
| CORP-SAMEPUB-001 | Same publisher, different article | Reject publisher/template-only equivalence | 20 | pair | same publisher; distinct resource | distinct | blocking completion | High-value false-merge case | Publisher-authorized or synthetic | No private publisher data |
| CORP-DIFFPUB-001 | Different publisher, same event | Reject event-equivalence as article identity | 20 | pair | different publisher; common event | distinct articles | blocking completion | Protect independent coverage | Same permitted categories | No ownership inference without provenance |
| CORP-FMERGE-001 | False-merge traps | Challenge title/name/topic collisions | 40 | pair | trap subtype; distinct rationale | distinct | blocking completion | Critical destructive-risk coverage | Prefer synthetic | Avoid sensitive real-person ambiguity |
| CORP-FSPLIT-001 | False-split traps | Exercise supported harmless variants | 40 | pair | equivalence transformation | same within approved contract | blocking completion | Strong recall coverage | Prefer synthetic | No protected short-string hashes in telemetry |
| CORP-URL-001 | Canonical URL variants | Validate allowlisted canonicalization | 30 | variant set | original, expected canonical, rule IDs | one expected canonical within set | blocking completion | Direct URL rule coverage | Synthetic URLs or authorized domains | No credentials or live sensitive query values |
| CORP-TRACK-001 | Tracking-parameter variants | Separate tracking from meaningful query identity | 25 | variant set | parameter classification | allowlisted tracking removed; meaningful retained | blocking completion | Prevent destructive parameter stripping | Synthetic URLs | No real tokens or identifiers |
| CORP-UNICODE-001 | Unicode-normalization edges | Exercise NFC and reject compatibility collapse | 30 | variant set | code points; NFC/NFKC relation | NFC-equivalent only where contract permits | blocking completion | Protect semantic Unicode distinctions | Synthetic strings | No production quote-derived samples |
| CORP-EMPTY-001 | Empty/insufficient content | Require explicit failure/insufficient state | 10 | document | empty/whitespace/metadata-only subtype | fail/insufficient; no invented data | blocking completion | Defines safe boundary | Synthetic | No issue |
| CORP-LONG-001 | Very long content | Bound deterministic processing/resource behavior | 10 | document | byte/character size; structure | deterministic completion within budget or explicit bounded rejection | blocking completion | Resource qualification | Synthetic/open/authorized | Avoid large copyrighted reproduction |

## Approved totals

- Minimum unique documents: **240**
- Minimum pair/group/variant-set evaluation units: **385**
- Minimum evaluated-language documents: **90**
- Minimum false-merge-oriented pairs: **130** across unrelated, same-publisher/different-article, different-publisher/same-event, and explicit false-merge categories
- Minimum false-split/exact-equivalence pairs: **80**

Because documents may participate in multiple relationships, the category minima cannot be summed into a unique-document total. The manifest must prove both the 240 unique-document floor and every category minimum independently.

## Language allocation

The 90 evaluated-language documents are:

- English: 30
- French: 30
- Arabic: 30

At least 10 per language must include meaningful punctuation/quotation/apostrophe or script-specific edge cases. Mixed-language documents are additional and do not satisfy the 30-document monolingual cohort minimum.

## Expansion rule

Add samples when:

- a defect reveals an uncovered class;
- a rule or supported language changes;
- a false merge/split is discovered;
- a corpus sample is removed;
- an algorithm version adds a transformation.

Expansion creates a new immutable corpus version. Holdout leakage or label-policy changes require partition review and may require a new major version.

## Completion rule

Phase 5.1 cannot claim completion until:

- all category and total minima exist;
- every sample has license, provenance, privacy, partition, checksum, and immutable ID metadata;
- validation/holdout partitions are approved;
- required labels are adjudicated;
- manifest checksums reproduce;
- every completion-blocking threshold is measured against the exact corpus version.

Composition approval does not mean the corpus exists or validates any threshold.
