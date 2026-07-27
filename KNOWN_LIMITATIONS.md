# LAFRYHI AI Radar Known Limitations

These are accepted v1.0.0-rc1 limitations. Accepted integrity controls, such as
strict evidence rejection and human-gated publication, are not defects.

## 1. Completed-finalization replay is not exposed

- **Description:** The already-completed internal analysis-finalization
  operation cannot be directly replayed through a production endpoint or
  operator action.
- **Reason accepted:** Avoids adding a privileged mutation surface solely for
  verification.
- **Operational impact:** Its exact second production return value is not
  directly observable.
- **Current mitigation:** Unit and integration tests, deterministic identities,
  transaction semantics, production structural invariants, and downstream
  publication idempotency.
- **Future action:** none
- **Priority:** low

## 2. Prompt hardening cannot eliminate invalid evidence

- **Description:** Prompt version `radar-decision-intelligence-v3` reduces but
  cannot eliminate non-verbatim model evidence.
- **Reason accepted:** Probabilistic model behavior cannot be guaranteed by
  prompting alone.
- **Operational impact:** A run may require one correction or fail validation.
- **Current mitigation:** Exact evidence validation, one bounded correction,
  terminal safe failure, and human review.
- **Future action:** monitor
- **Priority:** medium

## 3. Mismatch classification is approximate

- **Description:** Privacy-safe mismatch classification uses deterministic
  surface categories and bounded overlap lengths; it does not identify
  semantic intent.
- **Reason accepted:** It preserves privacy and never controls acceptance.
- **Operational impact:** Some mismatches are classified `unknown`, and an
  approximate category may not explain the exact model change.
- **Current mitigation:** Classification is observability-only; strict
  validation remains authoritative.
- **Future action:** monitor
- **Priority:** low

## 4. Token accounting depends on provider metadata

- **Description:** Token usage reflects the accounting fields available in
  model responses.
- **Reason accepted:** The application cannot recover provider accounting that
  is not returned.
- **Operational impact:** Some run-level usage fields may be absent or may not
  represent every provider-side accounting detail.
- **Current mitigation:** Treat token data as bounded operational metadata, not
  billing authority.
- **Future action:** monitor
- **Priority:** low

## 5. Retry backoff has no jitter

- **Description:** Transient Gemini and persistence retry backoff is
  deterministic.
- **Reason accepted:** Determinism simplifies testing and was an explicit
  Phase 4 requirement.
- **Operational impact:** Concurrent failures could synchronize retry timing.
- **Current mitigation:** Low canary volume, small fixed ceilings, and absolute
  attempt limits.
- **Future action:** candidate for later phase
- **Priority:** medium

## 6. HTML extraction is regex-based

- **Description:** Source ingestion removes scripts, styles, and tags using a
  simplified regex-based extraction path.
- **Reason accepted:** It supports the current trusted-source scope without
  introducing a new extraction subsystem during Phase 4.
- **Operational impact:** Navigation, footer, or other non-article text may
  remain, and unusual markup may extract poorly.
- **Current mitigation:** Trusted source registry, minimum-content and date
  validation, immutable snapshots, strict evidence grounding, and human review.
- **Future action:** candidate for later phase
- **Priority:** medium

## 7. Main-article DOM extraction is not implemented

- **Description:** The pipeline does not identify a semantic main-article DOM
  subtree.
- **Reason accepted:** It was outside Phase 4 recovery and atomicity scope.
- **Operational impact:** Source snapshots may contain page chrome or omit
  structurally unusual content.
- **Current mitigation:** Controlled source onboarding and canary processing.
- **Future action:** candidate for later phase
- **Priority:** medium

## 8. Future extraction changes can affect content hashes

- **Description:** Content hashes are derived from normalized source text.
  Redesigning extraction or normalization can change hashes for the same URL.
- **Reason accepted:** Hashes correctly represent the current immutable
  normalized snapshot.
- **Operational impact:** A future extraction migration may affect duplicate
  detection and historical comparisons.
- **Current mitigation:** Treat normalization changes as explicit migrations
  with compatibility analysis; do not silently rewrite existing records.
- **Future action:** candidate for later phase
- **Priority:** high

## 9. Raw model output is intentionally unavailable

- **Description:** Invalid raw Gemini output is not persisted or logged.
- **Reason accepted:** Prevents leakage of source content, prompt content,
  generated evidence, and sensitive data.
- **Operational impact:** Exact invalid responses cannot be reconstructed
  during incident analysis.
- **Current mitigation:** Bounded issue codes, field paths, response metadata,
  mismatch categories and lengths, versions, and deterministic tests.
- **Future action:** none
- **Priority:** low

## 10. A single-source canary is not universal coverage

- **Description:** The successful production canary validated one trusted
  source format and one execution path.
- **Reason accepted:** Controlled canaries intentionally minimize production
  data changes.
- **Operational impact:** Other trusted publishers or markup patterns may
  expose different ingestion or model behavior.
- **Current mitigation:** Strict failure behavior, source registration, human
  review, bounded recovery, and stable rollback.
- **Future action:** monitor
- **Priority:** medium

## 11. Feature flags require disciplined operations

- **Description:** Recovery and atomic finalization activation depends on two
  production environment flags.
- **Reason accepted:** Flags provide reversible, compatibility-preserving
  activation without schema or authentication changes.
- **Operational impact:** Incorrect flag values or revision selection could
  activate the wrong path.
- **Current mitigation:** Capture flags per revision, deploy with zero traffic,
  retain the flag-off fallback, and verify active configuration after routing.
- **Future action:** monitor
- **Priority:** high

## 12. This baseline is a release candidate

- **Description:** v1.0.0-rc1 is a controlled release candidate and not a claim
  of zero defects or unrestricted general availability.
- **Reason accepted:** Production evidence is strong but intentionally bounded,
  with one check `NOT_EXECUTABLE_BY_DESIGN`.
- **Operational impact:** Expansion should remain controlled and monitored.
- **Current mitigation:** `PASS_WITH_VERIFICATION_LIMITATION`, documented
  rollback, human gating, strict validation, and complete operational records.
- **Future action:** monitor
- **Priority:** medium
