# Phase 5 — Source Management

## Confirmed pre-implementation architecture

Audit date: 2026-07-24.

- `sourceRecords` contains immutable ingested-article provenance: canonical URL, publisher host, title, timestamps, normalized text, hash, and source type.
- Source intake currently validates HTTPS and a static Google-domain allowlist, then retrieves and normalizes HTML before creating a `sourceRecords` document.
- Initial processing persists an article, run, analysis, and pending review. Reruns operate on the stored article and create a separate pending analysis.
- The Operator Dashboard is protected by private Cloud Run invocation plus the existing server-side operator-token guard.
- Firestore access is server-side through one repository abstraction with Firestore, local-file, and memory implementations.
- `/operator/sources` currently lists ingested articles and exposes the existing manual-ingestion form; it is not a publisher registry.
- Review decisions and Radar publication remain independent of publisher configuration and must not be rewritten.

## Compatible Phase 5 design

Phase 5 adds `sourceRegistry` as the authoritative publisher configuration collection. It does not replace `sourceRecords`. New article records may reference their registry entry through an optional `sourceDefinitionId`, preserving compatibility with the existing production article.

Production intake will require:

1. a structurally valid HTTPS URL;
2. an exact registered canonical domain or its subdomain;
3. registry status `enabled`;
4. trust level `official`, `verified`, or `community`;
5. a non-archived, non-blocked entry.

Experimental sources can be registered and inspected but are not trusted for production intake. Archived entries are read-only. No scheduler, crawler, background worker, discovery agent, RSS poller, Pub/Sub topic, or automatic ingestion is introduced.

## Implementation and deployment record

### Firestore model

Collection: `sourceRegistry`.

Each document contains:

- `id`, `displayName`, `publisher`, and `canonicalDomain`
- HTTPS `homepage`, optional `rssUrl`, and optional `documentationUrl`
- `category`, `language`, and two-letter `country`
- `trustLevel`: `official`, `verified`, `community`, `experimental`, or `blocked`
- `status`: `enabled`, `disabled`, `blocked`, or `archived`
- `requiresHumanReview`, fixed to `true`
- bounded operator `notes`
- `createdAt` and `updatedAt`

The existing `sourceRecords` schema gained only optional `sourceDefinitionId`. Existing records without it remain valid. No production migration was run.

### Routes and interface

- `/operator/sources` — real aggregate count, bounded registry read, statistics, filter, sort, 20-item pages, registration form, trust/status badges, and empty states
- `/operator/sources/[id]` — metadata, safe links, state controls, processed/approved/rejected statistics, last processing time, and update form
- protected `POST /api/internal/operator/sources/process` — operator-token guarded manual intake with explicit HTTP 400/403 source-gate responses

All Firestore reads and writes remain server-side. The normal registry read is capped at 200 documents and displayed in pages of 20. No browser-side Firestore path or credential is exposed.

### Source state and trust rules

- Only `enabled` entries with `official`, `verified`, or `community` trust may enter initial processing or reruns.
- `experimental` entries cannot be enabled for production intake.
- Disabling immediately blocks new processing.
- Blocking sets both status and trust level to `blocked`.
- Archived entries are read-only and cannot be processed.
- Source metadata and state changes require protected, deliberate operator mutations.
- Production deletion is not implemented.

URL retrieval remains HTTPS-only, rejects credentials, localhost, IP literals, and unsafe cross-domain redirects. A redirect must remain on the registered canonical domain or its subdomain.

### Structured events

- `source.created`
- `source.updated`
- `source.enabled`
- `source.disabled`
- `source.blocked`
- `source.archived`
- `source.validation_failed`

The strict event schema permits only source ID, canonical domain, status transition, safe rejection reason, and timestamp. It cannot accept tokens, prompts, credentials, request headers, source bodies, or model responses.

### Validation

- `npm.cmd test`: passed — 11 files, 33 tests
- `npm.cmd run lint`: passed
- `npm.cmd run typecheck`: passed
- `npm.cmd run build`: passed — Next.js 16.2.11, including the source list/detail and protected intake route
- Cloud Build: `24b77e65-0014-4736-b029-eb43f36e0f24`, SUCCESS in 2m45s
- Image: `us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:phase5`
- Digest: `sha256:89ad9da701f8996b3e5c995e05d50529d3c60c6f45a1d2eb753da4e14341e740`
- Revision: `lafryhi-ai-radar-00007-scd`, Ready, 100% traffic

Live validation was intentionally non-mutating:

- authenticated source dashboard: HTTP 200
- empty-registry state rendered correctly
- unregistered official URL: HTTP 400 before retrieval, Gemini, or persistence
- `source.validation_failed` recorded with `not_registered`
- revision-scoped ERROR query returned no entries
- sensitive-marker log and rendered-output queries returned no entries
- `sourceRegistry` remained empty
- existing production counts remained 1 source record, 3 runs, 1 analysis, 1 review, and 1 Radar item

### Limitations

- Registry filtering and pagination cover a bounded 200-document working set. Firestore cursor pagination should replace this before exceeding that scale.
- RSS URLs are metadata only; no polling or scheduled ingestion exists.
- The existing production article predates the registry and has no `sourceDefinitionId`. Domain matching keeps its source statistics compatible after a matching registry entry is created.
- No live registry entry was created because Phase 5 validation was required to avoid temporary or speculative production data.
