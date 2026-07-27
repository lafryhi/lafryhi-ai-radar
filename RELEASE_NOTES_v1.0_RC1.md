# LAFRYHI AI Radar v1.0.0-rc1

**Status:** Release candidate

**Release date:** 2026-07-27
**Verification:** `PASS_WITH_VERIFICATION_LIMITATION`

## Release scope

This release candidate establishes the Phase 4 production baseline for the
LAFRYHI AI Radar. It includes the operational end-to-end analysis pipeline,
strict evidence grounding, bounded Gemini recovery, atomic readiness for human
review, explicit human approval, and atomic publication.

This is a release candidate for controlled production operation. It is not an
unrestricted general-availability declaration and does not claim zero defects
or complete coverage of every source format and provider failure mode.

## Completed capabilities

- Registered-source ingestion and immutable source snapshots.
- Structured Gemini analysis with deterministic schema validation.
- Strict evidence and duplicate-integrity validation.
- Lossless deterministic repair before regeneration.
- Bounded provider retry and full-object regeneration.
- Deterministic analysis, review, and published-item identities.
- Atomic creation of analysis readiness state.
- Human review as a mandatory publication gate.
- Atomic, idempotent approval and publication.
- Structured privacy-safe recovery and persistence telemetry.
- Operator dashboard, review queue, and rollback-ready Cloud Run revisions.

## Phase 4 summary

### Phase 4.1 — Validation and lossless recovery

Phase 4.1 introduced the typed failure taxonomy, parsing/validation separation,
strictly lossless repair, evidence-integrity validation, duplicate-integrity
validation, structured recovery telemetry, and deterministic unit coverage.
Lossless repair never truncates semantic content, clamps scores, invents
values, or silently discards conflicting information.

### Phase 4.2 — Bounded Gemini recovery

Phase 4.2 added retries only for transient timeouts, HTTP 429, HTTP 5xx, and
temporary network failures. Recovery retains the same processing run and
immutable input snapshots. The ceilings are:

- initial Gemini call: 1;
- identical transient retries: maximum 2;
- compact or correction regeneration: maximum 1 total; and
- absolute Gemini calls per processing run: maximum 4.

Malformed JSON, schema failures, evidence failures, and duplicate-integrity
failures may request one complete correction regeneration. Partial outputs are
never merged. Repeated invalid output fails safely.

### Phase 4.2.1 — Evidence hardening

Prompt version `radar-decision-intelligence-v3` requires evidence to be copied
directly from `SOURCE` as short, contiguous, character-for-character excerpts.
Quote-specific correction guidance preserves case, punctuation, apostrophes,
quotation marks, dashes, and Unicode characters.

Evidence acceptance requires an exact contiguous source substring after
Unicode NFC normalization and deterministic whitespace normalization only.
The validator does not use fuzzy matching, case-insensitive acceptance,
punctuation-insensitive acceptance, semantic-similarity acceptance,
closest-sentence substitution, automatic evidence replacement, or NFKC-based
compatibility collapsing.

### Phase 4.3 — Atomic analysis readiness

Phase 4.3 added a single Firestore transaction that creates the analysis,
creates the pending review, and moves the processing run to `pending_review`.
It uses deterministic identifiers, rejects conflicts and partial states, and
is idempotent for an exact already-completed state. Persistence retries are
bounded and apply only to transient persistence failures. Existing human
approval and atomic publication behavior remains unchanged.

## Human review and publication

No AI result can approve itself or publish automatically. A human operator
must explicitly approve a pending review. Approval and publication remain one
atomic transaction, and replay returns the same deterministic published item
without creating a duplicate.

## Production canary

The Phase 4 production canary processed exactly one new trusted source. All
executable deployment, evidence, persistence, queue, approval, publication,
privacy, orphan, and duplicate checks passed.

- Processing used `radar-decision-intelligence-v3`.
- The initial Gemini call succeeded with zero retries and zero regenerations.
- Analysis, pending review, and the run transition committed atomically.
- Deterministic analysis and review identifiers were observed.
- The review appeared in the operator queue.
- One explicit human approval created exactly one published item.
- Replaying publication returned idempotently with the same item.
- No orphan or duplicate records existed.
- No rollback criterion occurred.

Directly replaying the already-completed internal analysis-finalization
operation was `NOT_EXECUTABLE_BY_DESIGN`. No supported production interface
exposes that internal operation; invoking it would require an unsafe or
out-of-scope endpoint, runner, code change, or database manipulation. Unit,
integration, deterministic-identity, transaction, production-structure, and
downstream invariants provide assurance. Direct production finalization replay
was not executed.

The resulting gate is `PASS_WITH_VERIFICATION_LIMITATION`, not an
implementation failure.

## Production deployment state

- Active revision: `lafryhi-ai-radar-canary2-0f271d5`
- Active traffic: canary 100%
- Stable fallback: `lafryhi-ai-radar-baseline-3405af8`, 0% traffic
- `AI_RECOVERY_ENABLED=true`
- `ATOMIC_ANALYSIS_FINALIZATION_ENABLED=true`
- Image tag: `0f271d5`
- Image digest:
  `sha256:f474ae825989908e7412a073af865ed59277ea272b65102f0a2469e5c37d17b5`

The stable flag-off revision remains available for immediate traffic rollback.

## Verification status

- Tests: 190/190 passing across 18 files
- Lint: passing
- Typecheck: passing
- Production build: passing
- Production verification: `PASS_WITH_VERIFICATION_LIMITATION`

## Residual risks

- Model prompting reduces but cannot eliminate invalid evidence generation.
- A single successful canary does not cover every supported source layout.
- Raw model output is intentionally unavailable for detailed reconstruction.
- Regex-based HTML extraction can include non-article page content.
- Deterministic retry backoff has no jitter.
- Feature flags require disciplined operational ownership.

These risks are documented in `KNOWN_LIMITATIONS.md` and controlled through
strict validation, bounded recovery, human review, atomic transactions,
privacy-safe telemetry, and rollback availability.
