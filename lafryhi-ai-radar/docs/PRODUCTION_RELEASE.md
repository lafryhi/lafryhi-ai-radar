# LAFRYHI AI Radar — Production Release

## Phase 3 editorial calibration

The Editorial Policy Engine is model-independent and preserves mandatory human review. Its
presence does not authorize candidate promotion, canary traffic, publication, or deployment.
Before a production release, reviewers must approve the policy constitution version, inspect
raw and adjusted evaluation results, replay saved fixtures, and confirm that original model
decisions remain auditable. Rollback selects the previous reviewed constitution; it never
rewrites historical decisions.

Phase 3.1 uses constitution `editorial-policy-v1.1`. Release review must verify the
explicit evidence-state, uncertainty-state, source-authority, material-impact,
confidence-qualification, and numerical-verification inputs. A policy `ALLOW` never
authorizes publication: normal application review remains mandatory. Additional
policy-triggered review is reported independently. Known ambiguity remains whenever
runtime data cannot supply these semantic fields; such items must retain human review
rather than being inferred from language.

## Product

LAFRYHI AI Radar is a Gemini-powered Decision Intelligence Platform for small businesses. It turns verified AI signals and validated Business Context into evidence-linked Decision Briefs, then measures usefulness, action execution, reported outcomes, and aggregate product impact.

## Gemini Migration Stabilization

The active primary model remains `gemini-2.5-flash`; this phase does not perform a model cutover. Selection is environment-driven through `GEMINI_PRIMARY_MODEL` with `GEMINI_MODEL` retained for backward compatibility. Controlled retries and fallback are supported, while the configured fallback remains the current model. Shadow mode is disabled by default, never contributes production output, and must be explicitly configured for a later candidate evaluation. A future candidate-model validation phase is required before deployment or traffic changes.

### Phase 2: Candidate Evaluation

Phase 2 adds only a local, explicitly enabled comparison framework. Candidate output is redacted and cannot be persisted, published, returned through public APIs, or substituted for the production result. Production remains `gemini-2.5-flash`; Cloud Run configuration and traffic are unchanged. A preview model may be evaluated but is not approved for production. Passing thresholds authorizes at most further testing or a separately reviewed canary using a verified generally available model.

### Phase 2.5: Availability and smoke preparation

Availability probes and one-case smoke comparisons are local operator actions protected by exact allowlisting, an explicit real-call flag, a traceable run label, and request/token ceilings. Probe locations are evaluation-only and never change `GOOGLE_CLOUD_LOCATION` or Cloud Run. A successful probe means only that evaluation may continue. Production remains `gemini-2.5-flash`; no candidate, shadow enablement, deployment, or traffic change is included.

Smoke reports separate transport, response, JSON, schema-version, application-validation, and pipeline-completion outcomes. A downstream validation failure cannot be counted as a failed request. Reports also carry an evaluation-integrity state; dataset or harness defects and evaluations without a comparable completed case are `INCONCLUSIVE`, never production or canary approval.

## Runtime architecture

- Next.js 16 standalone server on Node.js 22 and Cloud Run.
- Vertex AI Gemini for the existing two-stage Signal Intelligence and Decision Intelligence engine.
- Firestore for production persistence.
- Anonymous HTTP-only browser sessions for public ownership.
- Existing operator token guard for operator pages and APIs.
- Cloud Scheduler headers plus a dedicated scheduler secret for scheduled RSS discovery.

## Required production environment

All values are runtime configuration. Never commit their real values.

| Variable | Requirement |
|---|---|
| `NODE_ENV` | `production` |
| `DEPLOYMENT_ENV` | `production` |
| `APP_BASE_URL` | Public HTTPS Cloud Run URL |
| `PERSISTENCE_ADAPTER` | `firestore` |
| `AI_ADAPTER` | `vertex` |
| `GOOGLE_CLOUD_PROJECT` | `lafryhi-ai-radar-xprize` |
| `GOOGLE_CLOUD_LOCATION` | `us-central1` |
| `FIRESTORE_DATABASE_ID` | `(default)` |
| `GEMINI_MODEL` | Valid Vertex AI model, currently `gemini-2.5-flash` |
| `VERTEX_TIMEOUT_MS` | `60000` |
| `GEMINI_MAX_OUTPUT_TOKENS` | `8192` |
| `OPERATOR_ACCESS_TOKEN` | Secret Manager binding, at least 20 characters |
| `RSS_SCHEDULER_JOB_NAME` | `lafryhi-ai-radar-rss-discovery` |
| `RSS_SCHEDULER_SECRET` | Separate Secret Manager binding, at least 20 characters |

Production configuration fails closed unless Firestore and Vertex AI are explicitly selected. Development defaults to the local-file adapter; tests always select memory.

## Clean build

Run from `lafryhi-ai-radar`, never from the parent repository:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

The application-local `npm ci` is required. Resolving Next.js from the parent repository is intentionally unsupported by Turbopack.

## Build and deployment

Verified existing target:

- Project: `lafryhi-ai-radar-xprize`
- Region: `us-central1`
- Service: `lafryhi-ai-radar`
- Runtime identity: `lafryhi-ai-radar-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com`
- Artifact Registry repository: `lafryhi-ai-radar`

Build with the application directory as the Cloud Build context:

```powershell
$PROJECT_ID="lafryhi-ai-radar-xprize"
$REGION="us-central1"
$TAG="sprint6-production"
$IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/lafryhi-ai-radar/lafryhi-ai-radar:$TAG"
gcloud builds submit . --project=$PROJECT_ID --config=cloudbuild.yaml --substitutions="_IMAGE=$IMAGE"
```

Deploy the existing service:

```powershell
$APP_URL="https://lafryhi-ai-radar-1090908272413.us-central1.run.app"
gcloud run deploy lafryhi-ai-radar --image=$IMAGE --project=$PROJECT_ID --region=$REGION --service-account="lafryhi-ai-radar-runtime@$PROJECT_ID.iam.gserviceaccount.com" --allow-unauthenticated --min=0 --max=1 --cpu=1 --memory=512Mi --concurrency=10 --timeout=120 --port=8080 --cpu-throttling --set-env-vars="NODE_ENV=production,DEPLOYMENT_ENV=production,APP_BASE_URL=$APP_URL,PERSISTENCE_ADAPTER=firestore,AI_ADAPTER=vertex,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=$REGION,GEMINI_MODEL=gemini-2.5-flash,VERTEX_TIMEOUT_MS=60000,GEMINI_MAX_OUTPUT_TOKENS=8192,FIRESTORE_DATABASE_ID=(default),RSS_SCHEDULER_JOB_NAME=lafryhi-ai-radar-rss-discovery" --set-secrets="OPERATOR_ACCESS_TOKEN=lafryhi-ai-radar-operator-token:latest,RSS_SCHEDULER_SECRET=lafryhi-ai-radar-scheduler-secret:2"
```

The checked-in release manifest is the reproducible deployment source of truth:

```powershell
gcloud run services replace cloudrun.service.yaml --project=$PROJECT_ID --region=$REGION
```

It deliberately omits `spec.template.metadata.name`. The previous exported service
configuration pinned an old revision name, so an apparently successful deploy could
leave traffic on the old image.

Before making the service public, configure the existing scheduler with the same scheduler secret as a request header while retaining OIDC:

```powershell
gcloud scheduler jobs update http lafryhi-ai-radar-rss-discovery --project=$PROJECT_ID --location=$REGION --update-headers="x-internal-scheduler-secret=$env:SCHEDULER_SECRET"
```

Do not print or commit `$env:SCHEDULER_SECRET`.

## Health and readiness

- `GET /api/health`: process-only check; never contacts Gemini or Firestore.
- `GET /api/readiness`: validates production configuration and performs one safe Firestore document read. It verifies Vertex AI configuration without generating content.
- Health returns HTTP 200.
- Readiness returns HTTP 200 when ready and HTTP 503 with a generic degraded response otherwise.
- Neither endpoint exposes project secrets, credentials, database paths, or internal exception messages.

## Firestore query/index review

Sprint 3–5 owner-scoped queries filter on one field (`ownerId` or `decisionBriefId`) and sort in application code. Current operator analytics use bounded whole-collection reads at MVP scale. No composite Firestore index is currently required, so no speculative `firestore.indexes.json` is included.

This query model is suitable for the current MVP data volume, not a claim of unbounded analytics scalability.

## Production smoke test

Automated locally:

- Full tests, lint, strict typecheck, and production build.
- RSS operator/scheduler authorization behavior.
- Environment, persistence, cookie, health, readiness, cross-session, idempotency, evidence, and analytics regression tests.

Manual against the deployed URL:

1. Confirm `/api/health` returns HTTP 200.
2. Confirm `/api/readiness` returns HTTP 200 and `status: ready`.
3. Open the homepage and select **Get Started**.
4. Create and save a Business Profile.
5. Select a published Trusted Signal.
6. Generate a Decision Brief and confirm evidence references and Decision Score.
7. Submit a usefulness rating.
8. Start the action, add a short note, complete it, and record an outcome.
9. Open **My Impact** and confirm the activity and timeline.
10. Restart or redeploy the service and confirm the profile, brief, progress, outcome, and analytics persist.
11. In a separate browser profile, verify the first session's profile and brief URL return not found.
12. Verify `/operator/analytics` redirects to operator login without valid operator access.
13. Verify scheduled RSS requests without the scheduler secret return 401.
14. Inspect browser bundles/network responses and confirm no prompts, tokens, owner IDs, or secrets appear.

## Sprint 6 production verification

- Production URL: `https://lafryhi-ai-radar-1090908272413.us-central1.run.app`
- Ready revision: `lafryhi-ai-radar-00042-8ff`
- Final image tag: `sprint6-production-final-v11`
- Health: HTTP 200, process-only.
- Readiness: HTTP 200 with configuration, Firestore, and Vertex AI ready.
- Protected runtime diagnostic: Firestore write/read/delete and a minimal Vertex AI request passed.
- Public journey executed: profile saved, trusted signal selected, two-stage Gemini brief generated,
  usefulness marked `USEFUL`, action moved to `IN_PROGRESS` then `COMPLETED`, outcome recorded as
  `POSITIVE`, and `/impact` reported the complete timeline and owner-scoped metrics.
- Cross-session brief access without the owner cookie returned HTTP 404.
- Operator analytics without operator access redirected to `/operator/login`.
- Scheduled RSS discovery without its authorization headers returned HTTP 401.
- The Business Profile survived multiple Cloud Run revision deployments, confirming Firestore-backed
  production persistence rather than process memory.

The production smoke records use the clearly labeled business name
`Sprint 6 Production Smoke Business`; they contain no personal information.

## Rollback

List revisions and route all traffic to the last known-good revision:

```powershell
gcloud run revisions list --service=lafryhi-ai-radar --project=$PROJECT_ID --region=$REGION
gcloud run services update-traffic lafryhi-ai-radar --project=$PROJECT_ID --region=$REGION --to-revisions="LAST_KNOWN_GOOD=100"
```

Rollback does not migrate or delete Firestore data. If scheduler-secret enforcement is rolled back, reassess public access before moving traffic.

## MVP limitations and privacy boundaries

- Anonymous sessions are browser-cookie based; clearing the cookie loses access to that session's private records.
- There is no account recovery, team access, billing, or cross-device synchronization.
- Outcomes are user-reported and do not prove revenue or causality.
- Operator aggregate analytics exclude owner IDs, business names, notes, summaries, and raw Gemini output.
- The runtime identity requires Firestore, Vertex AI, logging, and scoped Secret Manager permissions already documented in the project cloud setup.

## Phase 5.1 report gate

Require evaluation v2.6 and report v1.1. Reject reports with missing metadata,
detector disagreement, incomplete traceability, inconsistent timestamps/request totals,
invalid manifest references, or admissible metrics under invalid integrity. The first
shadow report remains invalid and observational only.

### Phase 5.2.1 request-budget control

The evaluator uses dataset case 1 as its availability gate. There is no separate
smoke invocation. The complete 15-case plan is exactly 60 provider attempts,
and request 61 is rejected locally. Production, models, dataset, contracts,
policy, and thresholds are unchanged.
