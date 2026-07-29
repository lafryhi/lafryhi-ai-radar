# Phase 4 — Operator Dashboard

## Confirmed pre-implementation architecture

Audit date: 2026-07-24.

- Next.js App Router, React, TypeScript, Zod, and server actions run in one Cloud Run service.
- Firestore production collections are `sourceRecords`, `processingRuns`, `analysisResults`, `reviewDecisions`, and `radarItems`. Local development uses the same domain schemas through a file-backed repository.
- Operator access is enforced server-side using the `OPERATOR_ACCESS_TOKEN` secret. The token is compared using SHA-256 digests and `timingSafeEqual`, then held only in an HTTP-only, Secure, SameSite=Strict cookie scoped to `/operator`.
- The existing operator mutation service creates `pending` reviews after every initial analysis and rerun. Existing decisions support `pending`, `approved`, `rejected`, and `needs_changes`.
- The existing public feed reads only `radarItems` whose publication state is `published`.
- Initial processing and reruns emit `pipeline.completed`; malformed recovery input emits `pipeline.validation_rejected`.
- The current operator screen combines ingestion, review, and run evidence on one page. It performs unbounded collection reads and has no dedicated queue/detail workspace.
- The current approval implementation uses a random Radar item ID and does not make repeated approval idempotent. Phase 4 must close this before exposing production review actions.
- There is no reusable component library. The existing CSS variables, panels, buttons, status metadata, and layout are the appropriate visual foundation.

## Constitutional boundary

Gemini produces analysis only. Pipeline completion always creates a pending human review. Publication requires an explicit protected operator mutation. A rerun creates a separate pending analysis and cannot replace an existing human decision.

## Implementation record

### Dashboard architecture and routes

All workspace routes are grouped beneath a protected server layout:

- `/operator` — real Firestore counts, pending work, latest approval, latest failure, and last successful completion
- `/operator/review` — bounded queue with status, category, publisher, score, date, and sort controls
- `/operator/review/[id]` — source facts, AI analysis, scores, recommendation, human decision, and provenance
- `/operator/published`
- `/operator/rejected`
- `/operator/sources`
- `/operator/runs`
- `/operator/login` remains outside the protected layout

The browser receives rendered review data, never Firestore credentials or paths. All reads and mutations execute server-side through the existing repository abstraction. Normal workspace reads are capped at 100 documents per collection; dashboard headline counts use Firestore aggregation queries.

### Authorization boundary

Cloud Run remains private and requires an authenticated Google Cloud invocation. The application then requires the existing HTTP-only operator cookie. The cookie contains the Secret Manager-provided token, is Secure in production, SameSite=Strict, scoped to `/operator`, and unreadable by client JavaScript. No new identity system, IAM binding, service account, key, or secret was added.

Live checks:

- request without Cloud Run identity: HTTP 403
- authenticated Cloud Run request without operator cookie: HTTP 307 to `/operator/login`
- authenticated request with the server-managed operator credential: dashboard and review detail HTTP 200

### Human-review state machine

- Initial analysis and every rerun create a separate `pending` review.
- `pending` or `needs_changes` may transition to `approved` or `rejected`.
- `approved` and `rejected` are terminal in this phase.
- Rejection requires a reason of at least five characters.
- An approved duplicate request returns the existing Radar item and creates nothing.
- Any conflicting terminal transition returns HTTP 409 through the protected review endpoint.
- Malformed protected mutations return HTTP 400; missing records return HTTP 404; unexpected persistence failures return a safe HTTP 503.

Approval uses the existing publication workflow. New Radar IDs are deterministic (`radar-{analysisId}`), and the repository first looks for an existing item by analysis ID. Rejection preserves the source, run, analysis, and review and never creates a Radar item.

### Firestore query and data-integrity strategy

Existing collections remain unchanged: `sourceRecords`, `processingRuns`, `analysisResults`, `reviewDecisions`, and `radarItems`. Direct document reads resolve detail-page provenance. Queue reads are bounded to 100. Firestore count aggregations provide real overview metrics without loading entire collections. No migration, replacement collection, temporary record, or browser-side Firestore access was introduced.

### Structured operator events

Safe strict-schema events:

- `operator.dashboard_viewed`
- `operator.review_opened`
- `operator.review_approved`
- `operator.review_rejected`
- `operator.review_conflict`
- `operator.action_failed`

Permitted fields are review, analysis, source, run, and Radar IDs; previous/resulting status; action; safe reason; and timestamp. Tokens, headers, source bodies, prompts, model responses, credentials, and environment data are not accepted by the event schema.

### Testing and validation

- `npm.cmd test`: passed — 9 files, 26 tests
- `npm.cmd run lint`: passed
- `npm.cmd run typecheck`: passed
- `npm.cmd run build`: passed — Next.js 16.2.11 and all Operator Dashboard routes
- Cloud Build `1c3d3f7a-0464-46c5-b138-f279e3fe5190`: SUCCESS in 2m14s
- Image digest: `sha256:85ad0b52932f339f2acba91977bfebffa0e260935b34b717e44f5e4d443c6ff4`
- Cloud Run revision: `lafryhi-ai-radar-00006-jbr`, Ready, 100% traffic

Live validation was read-only. The existing source, three processing runs, analysis, review, and Radar item remained at counts 1/3/1/1/1. The approved Radar ID remained `2e6715b2-c8c1-427c-8979-bae127851db5`. No review mutation was invoked.

### Known limitations

- The environment-token guard remains temporary and is not multi-user authentication.
- Pagination is a bounded first-page strategy; cursor navigation is deferred until record volume requires it.
- Filters operate on the bounded current dataset and do not add search infrastructure.
- Live approve/reject was intentionally not exercised against the only genuine production record. State-transition behavior is validated with deterministic isolated repositories.
