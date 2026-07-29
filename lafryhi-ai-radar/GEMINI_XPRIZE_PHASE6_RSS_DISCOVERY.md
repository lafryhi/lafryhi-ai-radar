# Phase 6 — Controlled RSS Discovery and Scheduled Intake

## Confirmed pre-implementation architecture

Audit date: 2026-07-24.

- Next.js App Router runs as one private Cloud Run service using the dedicated runtime identity.
- Firestore production access is server-side through the shared Firestore/local/memory repository abstraction.
- `sourceRegistry` is the authoritative publisher configuration. Only enabled Official, Verified, or Community sources pass the Phase 5 gate.
- `sourceRecords` represents retrieved article provenance; processing creates separate run, analysis, and pending human-review documents.
- Approval and publication are explicit protected operator actions. Reruns create new pending analyses and cannot replace terminal review decisions.
- Operator pages require private Cloud Run invocation plus the server-side HTTP-only operator-token session.
- Strict structured logs contain allowlisted identifiers and operational states, never secrets, prompts, model output, or source bodies.
- Current production revision is `lafryhi-ai-radar-00007-scd`; Firestore contains no source-registry entries and retains one historical article, three processing runs, one analysis, one approved review, and one Radar item.
- `GEMINI_XPRIZE_MASTER_PLAN.md` is not present. The Phase 2, Phase 4, and Phase 5 canonical documents were inspected.

## Phase 6 architecture decision

Phase 6 uses candidate-first discovery:

1. A bounded manual or scheduled run selects eligible registry sources.
2. The configured RSS/Atom feed alone is retrieved and parsed.
3. Metadata-only candidates are validated and deduplicated.
4. Accepted candidates remain pending.
5. A human operator must deliberately process a candidate through the existing article retrieval, Vertex AI analysis, schema validation, persistence, and pending-review pipeline.
6. Publication remains a separate human approval action.

New collections:

- `rssCandidates` for metadata-only pending/processed candidates.
- `rssDiscoveryRuns` for bounded operational summaries.

No raw XML, feed body, article body, prompt, model response, token, credential, or authorization header is stored in either collection.

## Dependency decision

No dependency is added. The service will parse a deliberately limited RSS 2.0 and Atom subset from a maximum 512 KiB response. DTD and entity declarations are rejected. This avoids expanding the runtime dependency surface for a bounded, non-general-purpose feed parser.

## Implemented application architecture

Phase 6 adds two optional, backward-compatible domain records:

- `rssCandidates`: metadata-only article candidates with source/run provenance, normalized URL, optional hashed feed identifier, discovery timestamps, and `pending` or `processed` state.
- `rssDiscoveryRuns`: bounded summaries with trigger, timestamps, status, source/feed/item counters, and allowlisted error categories.

The Firestore, local-file, and memory adapters implement the same repository interface. Existing documents and collections were not migrated or rewritten. No composite Firestore index was required: normal page reads are bounded, and sorting is performed after bounded repository reads.

The shared `discoverRss` service is used by both entry points:

- Manual operator action: `POST /api/internal/operator/rss/discover`
- Scheduled action: `POST /api/internal/rss/scheduled`

The operator source-detail page provides an explicit-confirmation **Discover now** action and displays the safe feed origin/path, recent run state, counters, and pending candidates. Processing a candidate is a separate deliberate operator action that invokes the existing governed intake pipeline. It revalidates the source registry and creates a pending human review; it never approves or publishes.

A deterministic protected diagnostic route, `POST /api/internal/rss/diagnostics`, uses an in-memory repository and a fixed local RSS string. It performs no network request, Gemini request, or Firestore write and exists only for production-like safety validation.

## Eligibility and feed security

Production discovery requires all of the following:

- status `enabled`;
- trust `official`, `verified`, or `community`;
- a valid HTTPS RSS/Atom URL;
- feed host and article host equal to or a subdomain of the registered canonical domain.

Disabled, blocked, archived, experimental, missing-feed, malformed, or unsafe sources are rejected or skipped before useful retrieval. The fetcher:

- rejects credentials, literal IP hosts, localhost, and DNS results in private, loopback, link-local, reserved, multicast, or documentation ranges;
- allows at most three same-domain redirects;
- accepts only XML/RSS/Atom response types;
- limits responses to 512 KiB and times out after 10 seconds;
- rejects DTD/entity declarations;
- parses only the configured RSS 2.0 or Atom document;
- never follows article links during discovery;
- never stores raw XML or complete feed bodies.

## Bounded execution and deduplication

Hard limits are:

- 10 sources per run;
- sequential feed processing;
- 50 items examined per feed;
- 10 accepted candidates per source;
- 25 accepted candidates per run;
- 512 KiB per feed;
- three redirects;
- 10-second network timeout.

Canonical URL normalization is conservative: HTTPS is required, host casing/default ports and fragments are normalized, and query parameters are preserved. Deduplication checks existing `sourceRecords`, existing `rssCandidates` by normalized URL, optional SHA-256 feed-identifier hash, and candidates already accepted in the current run. Prior records and decisions are never overwritten.

## Authorization and scheduling

Cloud Run remains private. Manual use requires both Cloud Run invocation authorization and the existing server-side operator-token guard. The scheduler endpoint relies on Cloud Run IAM/OIDC as the primary boundary and checks Cloud Scheduler headers/job identity as defense in depth.

Confirmed scheduler configuration:

- API: `cloudscheduler.googleapis.com`
- job: `lafryhi-ai-radar-rss-discovery`
- region: `us-central1`
- schedule: `0 8 * * *`, `Etc/UTC`
- state: enabled
- method: POST
- attempt deadline: 120 seconds
- retry count: 1
- identity: `lafryhi-ai-radar-scheduler@lafryhi-ai-radar-xprize.iam.gserviceaccount.com`
- IAM: only service-level `roles/run.invoker` on `lafryhi-ai-radar`
- OIDC audience: canonical Cloud Run service URL

There is no `allUsers` or `allAuthenticatedUsers` binding, shared query secret, service-account key, Pub/Sub resource, worker, or background loop.

## Structured events

Allowlisted events are:

- `rss.discovery_started`
- `rss.discovery_completed`
- `rss.source_started`
- `rss.source_completed`
- `rss.source_skipped`
- `rss.feed_validation_failed`
- `rss.feed_fetch_failed`
- `rss.feed_parse_failed`
- `rss.item_rejected`
- `rss.item_duplicate`
- `rss.item_accepted`
- `rss.schedule_unauthorized`

Events contain only safe IDs, counts, state/reason values, and timestamps. They exclude feed/article bodies, raw XML, prompts, model output, tokens, authorization headers, credentials, and sensitive URL query strings.

## Automated validation

Executed on 2026-07-24:

- `npm.cmd test`: 12 test files, 53 tests passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run build`: passed with Next.js 16.2.11.

Tests cover RSS and Atom, every ineligible source state, missing feed handling, malformed/oversized feeds, unsafe network targets, redirect/domain enforcement, duplicate URL and feed identifiers, item/run bounds, per-item isolation, manual/scheduled authorization, no publication, safe logs, deterministic diagnostics, and Phase 1–5 regression behavior. No test uses a live feed.

## Deployment evidence

- Archive: `.phase6/lafryhi-ai-radar-phase6.tar.gz` (one archive)
- Cloud Build: `bb1c4955-b0ad-445c-af9a-2a00fe744a71`
- Build status/duration: `SUCCESS`, 2 minutes 43 seconds
- Image: `us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:phase6`
- Digest: `sha256:b18f031717e55cd9997c8c4db6f261d48c724f671e5c687dbf55fffdf16fbadb`
- Cloud Run revision: `lafryhi-ai-radar-00008-64p`
- Traffic: 100%
- Runtime identity: unchanged dedicated runtime service account
- Secret binding: unchanged Secret Manager version
- Ready/healthy: yes
- CPU: one, request-throttled
- Memory: 512 MiB
- Concurrency: 10
- Request timeout: 120 seconds
- Minimum instances: 0
- Service-level maximum instances: 1

## Safe live validation

- Unauthenticated Cloud Run root: HTTP 403.
- Authenticated `/operator/sources` with the server-side operator session: HTTP 200.
- Authenticated manual action without operator token: HTTP 401.
- Authenticated scheduled route without scheduler headers: HTTP 401 and `rss.schedule_unauthorized`.
- Protected deterministic diagnostic: first pass accepted one candidate; second pass detected one duplicate; candidate count one; publication count zero; persistence `memory_only_nonpersistent`.
- Revision-scoped application `ERROR`-or-higher query: no entries.
- RSS structured events were present for start, source processing, acceptance, duplicate detection, completion, and rejected scheduler authorization.
- Potential sensitive-log keyword matches were limited to the expected Cloud Run unauthenticated-request warning and platform audit events; no credential or secret value was present.

Firestore counts before and after live validation were unchanged:

- `sourceRegistry`: 0
- `sourceRecords`: 1
- `processingRuns`: 3
- `analysisResults`: 1
- `reviewDecisions`: 1
- `radarItems`: 1
- `rssCandidates`: 0
- `rssDiscoveryRuns`: 0

No unknown external feed or second real source was processed. No production record or Radar item was modified, and no temporary Firestore record remains.

## Known limitations and rollback

- Production has no registered source yet, so the scheduled job will safely produce no candidates until an operator registers an eligible feed.
- The intentionally narrow parser supports conventional RSS 2.0 and Atom, not every extension or malformed legacy dialect.
- The application header checks are defense in depth; Cloud Run IAM and the scheduler OIDC identity are the authoritative scheduled-access boundary.
- An unregistered source was verified before persistence in Phase 5 and by deterministic Phase 6 tests; live Phase 6 did not repeat that mutation-capable request because the registry is empty and production records were to remain untouched.

Rollback is to route 100% traffic to `lafryhi-ai-radar-00007-scd`, pause the scheduler job, and remove only the scheduler service-level invoker binding if scheduled invocation must be disabled. Firestore records require no migration rollback, and historical Phase 1–5 evidence remains intact.

## Phase 6.1 founding-source registration

On 2026-07-24, the human operator approved Google AI Updates, Google DeepMind
News, NVIDIA Deep Learning, Hugging Face Blog, and Mistral AI News.

Before registration, source governance was strengthened:

- normalized feed URLs are persisted and rejected when duplicated;
- `source.registration_verified` and `source.registration_rejected` use the
  existing structured logging architecture;
- verified events include safe publisher/domain/trust/status/action/validation
  metadata and a SHA-256 feed URL hash;
- creating an enabled source also emits `source.enabled`.

No collection or dependency was added. Local validation passed with 12 test
files and 55 tests, plus lint, typecheck, and production build.

Deployment:

- Cloud Build: `73ec3c97-ed1b-40bb-8605-155b65ce2046`
- Status/duration: `SUCCESS`, 2 minutes 15 seconds
- Image: `us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:phase6-1`
- Digest: `sha256:f2544780be3127e0ae908c661c4220d3143e5cbbff704031cc2a93f3d07174ac`
- Revision: `lafryhi-ai-radar-00009-n45`
- Traffic: 100%
- Private IAM, runtime identity, secret binding, minimum 0, and service maximum
  1 were preserved.

The five protected registrations produced five unique domains, five unique feed
URLs, and five verified audit events. One bounded manual discovery was then run
against Google AI Updates only: run
`353333eb-16bb-430e-92c3-8dad0620debc` examined 20 items, accepted 10,
detected no duplicates, skipped 10 due to the acceptance bound, and had zero
validation failures. The ten candidates remain pending. No Gemini, analysis,
review, or publication record was created.

Full source IDs, rejected candidates, counts, and evidence are recorded in
`GEMINI_XPRIZE_FOUNDING_SOURCES.md`.
