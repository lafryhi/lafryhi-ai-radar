# Phase 5.1 Language Cohort Policy

## Status

- Policy status: Approved for initial deterministic evaluation
- Approval date: 2026-07-27
- Algorithmic implementation: Not started
- Evaluated-support claims: Not yet available
- Baseline evidence contract: Unchanged

## Core distinction

### Algorithmic support

Future Phase 5.1 deterministic normalization and fingerprinting must operate on Unicode strings without intentionally corrupting any language. Generic processing is not an accuracy claim.

### Evaluated language cohorts

Only a language with an approved labeled cohort that has completed qualification may be described as evaluated. Initial planned cohorts are English, French, and Arabic.

### Unsupported or unevaluated languages

Other languages may pass through generic deterministic Unicode-safe logic, but they are `UNEVALUATED_ALLOWED_WITHOUT_CLAIMS`. No language accuracy, canonical equivalence, or quality claim may be made.

## Universal rules

- Unicode normalization: NFC only for approved identity-normalization operations.
- NFKC and compatibility collapsing: prohibited.
- Case folding: prohibited for exact identity/equivalence.
- Punctuation removal or substitution: prohibited.
- Diacritic removal: prohibited.
- Transliteration: prohibited.
- Stemming/translation: prohibited.
- Whitespace: only the explicitly versioned deterministic whitespace contract may apply.
- Source and output code points remain inspectable in restricted corpus fixtures.
- Phase 5 artifacts never rewrite Phase 4 source text or accepted evidence.
- Phase 4 evidence remains an exact contiguous substring after NFC and deterministic whitespace normalization only.

## English cohort

- **Policy state:** APPROVED_INITIAL_COHORT
- **Minimum corpus cohort:** 30 monolingual documents
- **Scripts:** Latin; include typographic quotes/dashes and combining marks
- **Diacritics:** Preserve
- **Case folding:** None for identity
- **Punctuation:** Preserve
- **Unicode NFC:** Apply only where the versioned contract specifies
- **Whitespace:** Deterministic approved rule only
- **Acceptance limitation:** No evaluated-support claim until the corpus exists and thresholds pass

## French cohort

- **Policy state:** APPROVED_INITIAL_COHORT
- **Minimum corpus cohort:** 30 monolingual documents
- **Scripts:** Latin with accented precomposed/decomposed forms
- **Diacritics:** Preserve accents and diaereses; never strip
- **Case folding:** None for identity
- **Punctuation:** Preserve
- **Apostrophes:** Straight (`'`) and typographic (`’`) remain distinct unless the exact source/contract representation is identical after NFC; no substitution
- **Unicode NFC:** Canonically compose equivalent sequences only
- **Whitespace:** Deterministic approved rule only, including French spacing fixtures without punctuation normalization
- **Acceptance limitation:** No linguistic equivalence or tokenization claim

## Arabic cohort

- **Policy state:** APPROVED_INITIAL_COHORT
- **Minimum corpus cohort:** 30 monolingual documents
- **Scripts:** Arabic; include Arabic-Indic digits, combining marks, Arabic punctuation, and bidirectional contexts
- **Diacritics:** Preserve
- **Case folding:** Not applicable; no substitute normalization
- **Punctuation:** Preserve Arabic and non-Arabic punctuation
- **Tatweel:** Preserve; do not remove or insert
- **Presentation forms:** Preserve compatibility distinctions; NFC does not replace NFKC and presentation forms are not collapsed
- **Unicode NFC:** Canonical equivalence only
- **Whitespace:** Deterministic approved rule only
- **Acceptance limitation:** No morphological, tokenization, dialect, or semantic equivalence claim

## Mixed-script handling

- **Policy state:** UNEVALUATED_ALLOWED_WITHOUT_CLAIMS
- Minimum planned fixtures: 15 additional mixed-language documents
- Preserve all scripts and directionality code points except transformations explicitly allowed by the normalization contract.
- Do not infer a primary language for identity behavior.
- Do not transliterate or map confusables.
- Mixed-script detection, if later added, is advisory and separately evaluated.

## Unevaluated-language policy

Any language outside English, French, and Arabic:

- may be processed by generic pure Unicode-safe code;
- must preserve code points under the approved transformation set;
- receives no evaluated-support badge or accuracy metric;
- cannot be rejected solely because its language is not evaluated unless a later contract requires a language-specific operation;
- must not trigger aggressive normalization.

State: `UNEVALUATED_ALLOWED_WITHOUT_CLAIMS`.

## Acceptance limitations

- Cohort policy and numeric minima are approved; samples do not yet exist.
- No language detector is authorized in 5.1A or 5.1B.
- No evaluated-support claim is available until the full cohort passes applicable deterministic thresholds.
- Evidence matching behavior is not changed by this policy.
