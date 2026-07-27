# LAFRYHI AI Radar Architecture Decisions

## ADR-001 — Strict verbatim evidence validation

**Status:** Accepted

### Context

AI-generated analysis must cite authoritative source material. A semantically
similar sentence is not necessarily a quotation, and small changes in
negation, attribution, punctuation, or scope can change meaning.

### Decision

Every evidence quote must be an exact contiguous excerpt of the immutable
normalized source after Unicode NFC and deterministic whitespace normalization
only. Case, punctuation, apostrophes, quotation marks, dashes, and other
Unicode characters remain significant.

### Consequences

Non-verbatim evidence fails validation and may receive one bounded correction
regeneration. Repeated invalid evidence fails safely and never reaches review.
Some semantically accurate paraphrases are rejected because they are not valid
quotes.

### Rejected alternatives

Fuzzy matching, case-insensitive acceptance, punctuation-insensitive
acceptance, semantic-similarity acceptance, closest-sentence substitution, and
automatic evidence replacement were rejected because they can silently attach
unsupported source authority to altered text.

## ADR-002 — NFC normalization without NFKC

**Status:** Accepted

### Context

Unicode can represent canonically equivalent text with different code-point
sequences. Compatibility normalization can additionally collapse characters
that look or behave similarly but may carry distinct meaning.

### Decision

Normalize source and candidate evidence to Unicode NFC before deterministic
whitespace normalization and exact substring comparison. Do not use NFKC.

### Consequences

Canonically equivalent Unicode evidence is accepted without weakening case or
punctuation integrity. Compatibility characters remain distinct and can cause
a safe validation failure.

### Rejected alternatives

Raw code-unit-only comparison was rejected because it produces false failures
for canonical equivalents. NFKC was rejected because compatibility collapsing
can alter semantics, identifiers, typography, or source fidelity.

## ADR-003 — Bounded Gemini recovery

**Status:** Accepted

### Context

Provider calls can fail transiently, and structured model output can be empty,
truncated, malformed, schema-invalid, or integrity-invalid. Unbounded retries
increase cost, latency, nondeterminism, and operational risk.

### Decision

Use one initial Gemini call, at most two identical retries for transient
provider failures, at most one total compact or correction regeneration, and
an absolute ceiling of four Gemini calls per processing run. Temperature is
zero for the recovery path, inputs remain immutable, and regeneration requests
a complete replacement object.

### Consequences

Recovery is predictable and cost-bounded. Persistent invalid output becomes a
terminal failure. Internal attempts remain within the same processing run.

### Rejected alternatives

Unbounded retries, retrying permanent provider failures, merging partial
output, patch regeneration, multiple correction rounds, and creating a new run
for each internal attempt were rejected.

## ADR-004 — Deterministic identifiers

**Status:** Accepted

### Context

Client disconnects and transient persistence failures can make a caller
uncertain whether a commit succeeded. Random identities would permit duplicate
analysis, review, or publication records.

### Decision

Use:

- analysis: `analysis-${processingRunId}`;
- review: `review-${analysisId}`; and
- published item: `radar-${analysisId}`.

Conflicting content under a deterministic identity fails safely.

### Consequences

Repeated operations converge on the same records, structural audits can detect
conflicts, and downstream provenance is stable. Deterministic identifiers do
not grant permission and must not be treated as authorization tokens.

### Rejected alternatives

Random IDs for internally retried operations, overwrite-on-conflict behavior,
and content-blind upserts were rejected.

## ADR-005 — Atomic analysis readiness finalization

**Status:** Accepted

### Context

An analysis is ready for human review only when its analysis record, pending
review, and processing-run state agree. Independent writes can leave partial
or misleading readiness state.

### Decision

Create the AnalysisResult, create the pending ReviewDecision, and transition
the ProcessingRun to `pending_review` in one transaction. Verify source/run,
analysis, and review linkage; reject conflicts and partial states; accept an
exact already-completed state idempotently.

### Consequences

No partial readiness state is accepted. Transient persistence failures may be
retried within fixed ceilings. Integrity conflicts are terminal and never
overwrite existing records.

### Rejected alternatives

Sequential independent writes, deletion of partial records, destructive
overwrite, unconditional upserts, and treating all persistence errors as
validation failures were rejected.

## ADR-006 — Human-gated publication

**Status:** Accepted

### Context

AI recommendations may be incomplete or incorrect and must remain advisory.
Publication is an externally visible business decision.

### Decision

No automatic approval and no automatic publication are permitted. Publication
requires an explicit authenticated operator decision. Review approval and
Radar-item creation remain one atomic transaction.

### Consequences

Every published item has human-review provenance. The system may accumulate
pending reviews when operators are unavailable, which is preferable to
automatic publication.

### Rejected alternatives

Score-threshold auto-approval, AI self-approval, background publication,
approval outside the operator workflow, and separate non-atomic publication
writes were rejected.

## ADR-007 — No production finalization replay endpoint

**Status:** Accepted

### Context

Analysis finalization is an internal pipeline operation. Exposing it solely for
verification would create another privileged mutation surface and invite
accidental or unauthorized replay.

### Decision

Do not expose a production endpoint, operator action, or replay capability for
completed analysis finalization. Verify idempotency through direct unit and
integration tests, deterministic identities, transaction semantics,
production structural invariants, and downstream idempotency.

### Consequences

Direct completed-finalization replay is
`NOT_EXECUTABLE_BY_DESIGN` in production verification. This is a documented
verification limitation, not an implementation failure. Attack surface and
operational complexity remain smaller.

### Rejected alternatives

Temporary production endpoints, ad hoc production runners, direct database
manipulation, hidden operator actions, and permanently exposed internal replay
APIs were rejected.

## ADR-008 — Verification status taxonomy

**Status:** Accepted

### Context

Binary PASS/FAIL reporting incorrectly classified intentionally inaccessible
internal operations as implementation failures and failed to distinguish
skipped checks from external blockers.

### Decision

Requirement-level statuses are `PASS`, `FAIL`,
`NOT_EXECUTABLE_BY_DESIGN`, `NOT_RUN`, and `BLOCKED`. Overall gates are
`PASS`, `PASS_WITH_VERIFICATION_LIMITATION`, `FAIL`, and `INCOMPLETE`.

`PASS_WITH_VERIFICATION_LIMITATION` applies when every executable safety and
user-facing requirement passes, no failure or unresolved critical blocker
exists, and sufficient indirect evidence supports a design-limited internal
behavior.

### Consequences

Reports distinguish implementation defects, environmental blockers,
operator-skipped checks, and intentional production inaccessibility. Every
design-limited result requires explicit evidence and residual-risk analysis.

### Rejected alternatives

Treating all unexecuted checks as failures, treating blocked checks as passes,
and allowing undocumented exceptions to a binary gate were rejected.

## ADR-009 — Privacy-safe recovery telemetry

**Status:** Accepted

### Context

Recovery must be diagnosable without copying sensitive source material or
untrusted model output into durable logs.

### Decision

Never log raw Gemini output, source text, quote text, prompt bodies,
mismatching characters, credentials, tokens, secrets, or hashes derived from
small quotes. Permit only bounded event types, counters, stable issue codes,
field paths, durations, versions, and bounded mismatch categories and lengths.

### Consequences

Operational diagnosis is privacy-preserving but cannot reconstruct the exact
invalid output. Mismatch classifications are approximate and
observability-only; they never affect acceptance.

### Rejected alternatives

Raw-response logging, source excerpt logging, prompt logging, quote hashes,
character-difference logging, and telemetry-driven evidence acceptance were
rejected.

## ADR-010 — Feature-flagged production activation

**Status:** Accepted

### Context

Recovery and atomic finalization change critical pipeline behavior. Production
activation must be reversible without changing IAM, secrets, Firestore schema,
authentication, review, or publication code.

### Decision

Control activation with `AI_RECOVERY_ENABLED` and
`ATOMIC_ANALYSIS_FINALIZATION_ENABLED`. Keep a verified flag-off revision
available while canary traffic is active. Roll back traffic first when a
safety criterion occurs, then restore both flags to false in service
configuration.

### Consequences

Operators can rapidly restore the legacy path while preserving failure
evidence and data. Feature flags require disciplined configuration management
and are operational controls, not authorization or security boundaries.

### Rejected alternatives

Irreversible cutover, database migration as activation, deleting failed
records during rollback, relying on mutable image tags, and treating feature
flags as access controls were rejected.
