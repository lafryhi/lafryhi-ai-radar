# Phase 4.1 — Validation and Lossless Failure Recovery

## Scope

Phase 4.1 introduces a feature-flagged validation and recovery foundation for
Gemini analysis output. It does not retry provider calls, regenerate output,
change persistence ordering, reconcile stale runs, or alter publication.

The existing human-review gate and atomic approval/publication transaction are
unchanged.

## Feature flag

`AI_RECOVERY_ENABLED=false` is the compatibility default.

- Omitted or set to any value other than the exact string `true`: the existing
  production parser and normalizer remain active.
- Set to `true`: the Phase 4.1 parser, typed failures, lossless repair,
  evidence-integrity validation, duplicate-integrity validation, recovery
  decisions, and structured metrics are active.

The flag must first be enabled in a controlled environment. No data migration
is required and rollback consists of setting the flag to `false` and deploying
the configuration change.

## Recovery behavior

The enabled engine performs these stages in order:

1. parse one raw or recognized fenced JSON document;
2. apply deterministic lossless repairs;
3. validate the complete strict Gemini schema;
4. derive relevance locally;
5. validate every evidence quote against the normalized source text;
6. validate duplicate references against the exact previous-coverage context;
7. emit structured recovery metrics.

Allowed repairs are limited to:

- recognized JSON-fence removal;
- surrounding whitespace removal;
- removal of byte-equivalent strings after outer-whitespace normalization;
- removal of complete byte-equivalent entity and related-reference records after
  deterministic outer-whitespace normalization;
- converting empty non-opportunity detail strings to `null`;
- deriving a missing duplicate reason from already supplied related-reference
  reasons when the complete derived value fits the existing schema.

Every applied repair emits an `ai.recovery` event with its repair code and
field path. New output is never truncated, array entries are never sliced to a
maximum, scores are never clamped, and missing values are never invented.
Case-distinct and punctuation-distinct strings are preserved. Entity identity
collisions and repeated related-source identifiers with conflicting fields fail
integrity validation before any conflicting record can be removed.

Because retries and regeneration belong to Phase 4.2, an invalid result that
remains after lossless repair fails the current processing run. Phase 4.1 does
not expose deferred retry or regeneration decision branches.

## Metrics

Every `ai.recovery` event records:

- `recoveryType`;
- `retryCount`;
- `regenerationCount`;
- `repairCount`;
- `recoveryDurationMs`;
- `terminalFailureCategory`;
- safe repair code and field path when applicable.

Phase 4.1 always reports zero retries and regenerations because it does not
perform either action. Raw responses, prompts, evidence text, source text,
tokens, credentials, and secrets are not logged.

## Failure taxonomy

The stable terminal categories are:

- `response_envelope`;
- `schema_validation`;
- `evidence_integrity`;
- `duplicate_integrity`;
- `internal_invariant`.

## Migration notes

No Firestore schema, collection, index, authentication, UI, or stored-document
migration is required.

Existing analyses and reviews are untouched. The feature flag defaults to the
legacy path, so deployment alone does not change current production behavior.

When the feature is enabled, output previously accepted through lossy
normalization—such as an overlong key point or more than five evidence
items—will fail validation instead of being truncated or discarded. This is
intentional and prevents silent information loss.
