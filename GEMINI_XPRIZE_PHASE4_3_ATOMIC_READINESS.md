# Phase 4.3 — Atomic Analysis Readiness

## Scope

Phase 4.3 makes the transition from validated Gemini output to pending human
review atomic and idempotent. It does not change the existing human approval
workflow or the separate atomic approval/publication transaction.

No Firestore collection, schema, index, authentication rule, UI, RSS behavior,
or existing production document is changed.

## Feature flag

`ATOMIC_ANALYSIS_FINALIZATION_ENABLED=false` preserves the legacy sequence of
separate analysis, review, and processing-run writes.

When set to `true`, the pipeline uses deterministic identifiers:

- `analysis-${processingRunId}`;
- `review-${analysisId}`.

The analysis, pending review, and `pending_review` processing run are committed
through one repository finalization operation.

## Finalization contract

Every adapter verifies:

- the persisted run exists and is still processing, or is already the exact
  completed state;
- the source exists;
- run, source, analysis, and review linkage is exact;
- deterministic identifiers are used;
- the review is pending and unreviewed;
- existing records are either absent or a complete exact pair;
- partial or conflicting records are never overwritten.

An exact repeated finalization is idempotent. Firestore performs all reads
before transaction writes. Memory stages replacement maps before one commit.
Local persistence uses its existing temporary-file rename and restores memory
state if the flush fails.

The approval/publication transaction is unchanged.

## Persistence retries

Transient finalization failures receive at most two retries in the same
processing run:

- delays: 100 ms, then 200 ms;
- retryable: HTTP 429/5xx, Firestore ABORTED, DEADLINE_EXCEEDED,
  RESOURCE_EXHAUSTED, UNAVAILABLE, and fixed temporary network codes;
- integrity conflicts and permanent failures are never retried.

No document is deleted and no new processing run is created.

## Stale-run reconciliation

The fixed stale threshold is 15 minutes.

The authenticated pipeline recovery endpoint accepts
`{"action":"reconcile_stale"}`. When the Phase 4.3 flag is enabled:

- an exact deterministic analysis and pending review pair is reconciled by
  updating the processing run to `pending_review`;
- no final records produces an in-memory/telemetry
  `eligible_for_recovery` outcome without mutation;
- analysis-only, review-only, duplicate, or conflicting records produce a
  persistence-integrity outcome without deletion or overwrite.

Reconciliation never approves or publishes.

## Validation outcomes

With Phase 4.3 enabled:

- finalized validated output is `passed`;
- response, schema, evidence, and duplicate-integrity failures are `failed`;
- provider and persistence failures are `not_run`.

Flag-off behavior remains unchanged.

## Telemetry and migration

Structured `analysis.persistence` events contain action, deterministic IDs,
attempt and retry counts, elapsed time, feature state, and a bounded failure
category. They never contain article text, evidence quotes, Gemini output,
prompts, credentials, or secrets.

No data migration is required. Rollback is
`ATOMIC_ANALYSIS_FINALIZATION_ENABLED=false`.
