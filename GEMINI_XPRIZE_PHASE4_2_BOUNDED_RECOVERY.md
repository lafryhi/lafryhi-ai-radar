# Phase 4.2 — Bounded Gemini Self-Healing

## Scope

Phase 4.2 adds bounded provider retries and full-object regeneration to the
Phase 4.1 typed validation and lossless-repair path. It does not change
Firestore schemas or transactions, persistence retry behavior, stale-run
handling, RSS reconciliation, authentication, review, publication, or UI code.

`AI_RECOVERY_ENABLED=false` continues to select the legacy analyzer path.
`AI_RECOVERY_ENABLED=true` selects the Phase 4.2 recovery controller and uses
temperature `0`.

## Recovery limits

- Initial Gemini call: one.
- Identical retries for transient provider failures: at most two.
- Compact or correction regeneration: at most one in total.
- Absolute Gemini calls per processing run: four.
- `retryCount`: every Gemini call after the first, maximum three.
- `regenerationCount`: full-object regeneration calls, maximum one.

Internal retries remain part of the existing processing run.

## Provider classification

Identical retries are allowed only for:

- timeout or abort errors;
- HTTP 429;
- HTTP 500–599;
- fixed temporary network codes such as connection reset, timeout, temporary
  DNS failure, and temporary network unavailability.

HTTP 401/403, other 4xx responses, unsupported models, invalid configuration,
and unclassified failures are terminal. The backoff starts at 250 ms, doubles
to 500 ms for the second retry, honors a valid `Retry-After`, and is capped at
5 seconds.

## Regeneration

Compact regeneration is used only for empty output or `MAX_TOKENS`. Partial
output is never parsed or merged.

Correction regeneration is used only for malformed JSON, schema validation,
evidence integrity, or duplicate integrity. The request contains the immutable
source and previous-coverage snapshots plus stable failure category, issue
codes, and field paths. It never includes the invalid raw response or dynamic
exception prose. Every regeneration requests a complete replacement object.

A second invalid result is terminal.

## Telemetry

Bounded `gemini.recovery` events cover:

- provider retry started and completed;
- compact regeneration requested;
- correction regeneration requested;
- recovery succeeded;
- recovery exhausted.

Events contain attempt number, retry and regeneration counts, elapsed time,
model, prompt version, schema version, feature-flag state, bounded failure
category, and stable issue paths/codes. They never contain article text,
evidence quotes, raw Gemini output, prompt bodies, credentials, usage tokens,
or secrets.

## Migration and rollback

No schema or data migration is required. Rollback is the configuration change
`AI_RECOVERY_ENABLED=false`.
