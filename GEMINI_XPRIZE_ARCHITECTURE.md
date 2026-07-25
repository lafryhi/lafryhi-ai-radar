# LAFRYHI AI Radar — Minimal Production Architecture

**Status:** Phase 0 recommendation  
**Principle:** One deployable application, one operational database, one controlled AI pipeline.

> **Phase 1 confirmation (July 24, 2026):** The one-service approach is now implemented with Next.js App Router, strict Zod domain schemas, `@google/genai` in Vertex AI mode, local-file and Firestore repository adapters, a temporary operator token guard, an approval-gated public feed, and a standalone Cloud Run Dockerfile. Cloud deployment and successful live Vertex/Firestore operation are not yet confirmed.

## Current architecture

```text
Browser
  └── static index.html
        ├── css/style.css
        └── empty js/main.js
```

There is no backend, data store, authentication, model, deployment target, scheduled job, or observability layer.

## Proposed architecture

```text
Users
  │
  ▼
Cloud Run: single web application
  ├── server-rendered/public and authenticated UI
  ├── authenticated API endpoints
  ├── operator review endpoints
  ├── scheduled ingestion endpoint
  ├── controlled agent orchestrator
  └── payment webhook endpoint
        │
        ├── Firebase Authentication
        ├── Firestore
        ├── Vertex AI (Gemini)
        ├── Secret Manager
        └── Cloud Logging / Error Reporting

Cloud Scheduler ── authenticated invocation ──► ingestion endpoint
Approved source endpoints ───────────────────► scout stage
Hosted payment provider ── signed webhook ──► entitlement update
```

This uses a small, credible set of Google Cloud products without splitting the MVP into microservices. Cloud Run is the application boundary; Firestore is the operational store; Firebase Authentication handles identity; Vertex AI provides Gemini; Cloud Scheduler starts ingestion; Secret Manager protects production credentials. Cloud Logging is available through the Cloud Run runtime.

## Frontend

Adopt a TypeScript full-stack web framework that can run as one Cloud Run container. The implementation choice should be locked at Phase 1 after checking developer familiarity; a conventional React-based server framework is appropriate. Preserve the current landing page’s responsive layout and CSS tokens during migration, but replace broad ecosystem copy with the Radar promise.

Required views:

- Public landing/pricing/privacy/terms.
- Sign up/sign in/profile onboarding.
- Personalized Radar feed and item detail.
- Opportunity Radar.
- Daily Brief.
- AI Mission.
- Minimal account/billing.
- Protected operator review/run-status screen.

Progressive enhancement and server-side authorization are preferred. Do not rely on client-side hiding for paid or operator capabilities.

## Backend

Use the same Cloud Run service for HTML/UI, application API, scheduled job handler, agent orchestration, and payment webhook. Separate modules and queues are logical boundaries, not separate deployables.

Core modules:

- `auth`: verifies Firebase identity and maps application roles.
- `content`: feed/opportunity reads and operator publication.
- `profiles`: interests, role, goals, and feedback.
- `pipeline`: ingestion and ordered agent stages.
- `briefs`: daily brief materialization.
- `missions`: selection and lifecycle.
- `billing`: checkout initiation, signed webhook, and entitlement lookup.
- `operations`: run status, retry, review queue, and evidence export.

Long-running ingestion must respect Cloud Run request limits. For MVP, process a bounded source batch per scheduled invocation. If measured execution becomes unreliable, add Cloud Tasks as the first scale-out step; do not add it preemptively.

## Database

Use Firestore with server-side access for privileged collections and restrictive Security Rules for any client SDK use.

Suggested collections:

| Collection | Purpose |
|---|---|
| `users` | identity mapping, role, consent timestamps |
| `profiles` | interests, goals, personalization attributes |
| `sources` | allowlisted source metadata and ingestion policy |
| `raw_items` | immutable fetched metadata/content hash |
| `radar_items` | normalized analysis, provenance, scores, state |
| `opportunities` | opportunity-specific structured fields |
| `pipeline_runs` | stage status, model/version, latency, errors |
| `briefs` | per-user/day materialized brief |
| `missions` | selected mission and user outcome |
| `feedback` | saves, dismissals, completion/relevance signals |
| `subscriptions` | provider customer/status/entitlements |

Every derived item needs `sourceUrl`, `sourceId`, source publication time, retrieval time, content hash, pipeline run ID, verification state, model identifier, prompt/schema version, and publish/review timestamps.

Do not store full copyrighted page content unless source terms allow it. Prefer metadata, short excerpts where permitted, hashes, and generated summaries.

## Authentication and authorization

Firebase Authentication supplies sign-in. Begin with email-link or email/password plus verified email; add social providers only if onboarding data shows need.

Application roles:

- `user`: personal content and subscription.
- `operator`: review/publish/retry and evidence access.

Authorization is enforced on the server using verified ID tokens/custom claims. User documents are isolated by UID. Operator actions are audit-logged. Account deletion must remove or anonymize user-linked profile, feedback, brief, mission, and billing reference data subject to legal retention needs.

## AI agent orchestration

The agents are deterministic stages in one observable workflow, not independent services:

1. **Scout Agent** — fetches only allowlisted sources; emits source metadata and candidate records.
2. **Verification Agent** — checks canonical URL, dates, author/publisher, primary-source support, cross-source support, and contradictions; may reject.
3. **Analysis Agent** — produces factual short summary and “why it matters,” constrained to verified evidence.
4. **Classification Agent** — assigns controlled category/tags and detects opportunity type.
5. **Relevance Agent** — calculates profile-specific relevance from explicit factors.
6. **Opportunity Agent** — extracts deadline, timezone, eligibility, benefit, effort, and opportunity score; rejects missing critical facts.
7. **Recommendation Agent** — proposes a bounded next action with expected value/effort.
8. **Briefing Agent** — selects and compresses already-verified items into a daily brief and mission candidate.

Each stage receives JSON and must return schema-validated JSON. A failed schema, missing source evidence, expired deadline, or confidence below threshold routes the record to retry/review/rejection rather than publication.

### Scoring

Keep scores explainable. Use a weighted application formula around explicit features:

- Relevance: interest match, role/goal match, recency, novelty.
- Opportunity: relevance, expected benefit, eligibility confidence, deadline feasibility, inverse effort.
- Verification: primary-source authority, corroboration, date consistency, extraction completeness.

Gemini can extract and analyze inputs, but application code owns score ranges, thresholds, expiration rules, and publication state.

## Scheduled ingestion

- Cloud Scheduler invokes a private authenticated Cloud Run endpoint on a conservative schedule (initially two to four times daily).
- Scout loads enabled allowlisted sources and uses conditional requests/deduplication by canonical URL/content hash.
- Each invocation has batch and AI-call caps.
- Failed sources use bounded retries and appear in operations status.
- The initial source set should be small: authoritative model/platform blogs, competition/grant organizers, and selected policy sources.
- RSS/API/official feeds are preferred over brittle scraping.

## Source verification

Publication states: `candidate → verifying → needs_review | rejected | approved → published → expired`.

Rules:

- A primary/organizer source can be sufficient when identity, date, and details are internally consistent.
- Secondary reports should be corroborated by a primary source or a second independent reliable source.
- Opportunity deadlines and eligibility must link to the organizer’s canonical page.
- Store facts separately from generated interpretation.
- Display verification state and source link to users.
- Human operator approval is mandatory at launch for low-confidence, policy, financial-benefit, and opportunity records.

## Observability and evidence

- Structured Cloud Logging with run ID, stage, item ID, status, latency, token usage, estimated cost, and error class.
- `pipeline_runs` supplies durable product-visible evidence; logs alone are not the business record.
- Basic service metrics: request/error latency, pipeline success, rejection/review rates, publication freshness, model calls/tokens/cost, active users, actions, upgrades, and webhook failures.
- Never log secrets, full tokens, payment payloads, or unnecessary personal data.
- Export dated screenshots/CSV summaries weekly for submission resilience.

## Security

- Secret Manager for payment webhook secret and any non-Google credentials; use Cloud Run service identity for Google APIs.
- Private scheduled endpoint with authenticated Scheduler invocation.
- Least-privilege IAM; separate operator role from ordinary user.
- Validate all external URLs, request bodies, model outputs, and webhook signatures.
- Apply request/body/time limits, rate limits on costly endpoints, CSRF protection where applicable, secure cookies/headers, and dependency scanning.
- Treat fetched text as untrusted prompt-injection content; delimit it, prohibit tool instruction following, and allow only schema outputs.
- Publish privacy, terms, source-use, AI-generated-content, and deletion policies before onboarding external users.

## Cost controls

- One Cloud Run service with minimum instances set to zero until traffic requires otherwise.
- Small source allowlist and bounded scheduled batches.
- Deduplicate before model calls.
- Use the least expensive Gemini model that passes evaluation; escalate only difficult analysis.
- Cache and persist analysis, briefs, and missions.
- Per-run/per-user quotas and hard daily AI-call budget alarms.
- Limit retained raw content and logs.
- Track token usage and estimated cost per stage and per active user.

## Deployment topology

Use separate `staging` and `production` configurations, preferably separate Google Cloud projects if immediately available; otherwise separate services/databases with strict naming and IAM. Build container in CI or a reproducible local command, deploy to Cloud Run, and map `lafryhi.com` only after production health checks. Firestore indexes/rules and Scheduler jobs must be version-controlled.

Production secrets never enter Git or client bundles. Environment-variable names and safe local defaults belong in an example configuration file.

## Migration path

1. Initialize a Git repository and capture the untouched baseline in Phase 1 only.
2. Establish the single full-stack application inside a clearly named app directory; do not delete the archive.
3. Migrate the current landing structure/styles and replace ecosystem positioning with Radar scope.
4. Add local typed data schema and fixture-backed UI for the exact MVP records.
5. Add Firestore persistence and Firebase Authentication.
6. Add one end-to-end pipeline path with one source and observable stages.
7. Add scheduled ingestion and the small source allowlist.
8. Add personalization, brief, mission, and operator review.
9. Deploy staging then production on Cloud Run.
10. Add hosted checkout/webhook entitlements only after provider onboarding is confirmed.

## Deferred scale path

Add Cloud Tasks only when batch duration/retry measurements justify it, Pub/Sub only when multiple independent consumers exist, Cloud Storage only for required evidence/artifacts, and BigQuery only when analytics volume or submission queries exceed Firestore/export capabilities.
