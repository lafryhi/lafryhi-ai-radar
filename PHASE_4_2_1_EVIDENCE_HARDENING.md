# Phase 4.2.1 Evidence Hardening

Phase 4.2.1 strengthens Gemini evidence generation without changing the
pipeline's recovery ceilings, persistence behavior, or human-review and
publication workflows.

## Evidence acceptance

An evidence quote is accepted only when it is an exact contiguous substring
of the immutable normalized source after both values are:

1. normalized to Unicode NFC; and
2. normalized with the existing deterministic whitespace rule.

Case, punctuation, apostrophes, quotation marks, dashes, and other Unicode
characters remain significant. The validator does not use NFKC, fuzzy
matching, semantic similarity, closest-sentence substitution, or automatic
evidence replacement.

## Prompt and correction behavior

Prompt version `radar-decision-intelligence-v3` requires quotes to be copied
directly and character-for-character from `SOURCE`. For
`quote_not_in_source`, correction regeneration receives static remediation
guidance and the existing bounded issue code and field path. It receives
neither the rejected quote nor raw Gemini output and must return a complete
replacement object.

## Privacy-safe diagnostics

Existing `gemini.recovery` events include up to five
`evidenceMismatchDiagnostics` entries. Each entry contains:

- `fieldPath`, bounded to 300 characters;
- `quoteLength`, capped at 500 Unicode code points;
- `longestMatchingPrefixLength`, capped at 500 Unicode code points;
- `longestMatchingSuffixLength`, capped at 500 Unicode code points; and
- `mismatchClassification`: `whitespace`, `case`,
  `unicode_normalization`, `punctuation`, `absent`, or `unknown`.

Classification is deterministic, locale-independent, and observability-only.
`absent` means neither edge has an exact overlap of at least eight Unicode
code points after NFC and whitespace normalization; other unmatched cases are
`unknown`.
It never affects evidence acceptance. Diagnostics never contain quote text,
source text, mismatch characters, raw model output, or quote-derived hashes.

## Compatibility and migration

- `AI_RECOVERY_ENABLED=false` continues to select the legacy single-call
  path.
- Gemini retry, regeneration, and absolute call ceilings are unchanged.
- `ATOMIC_ANALYSIS_FINALIZATION_ENABLED` behavior is unchanged.
- No Firestore migration or schema change is required.
