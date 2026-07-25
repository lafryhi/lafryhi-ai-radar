# Phase 2 Minimal Google Cloud Staging Setup

**Status:** Checkpoints 1–8.1 complete; the real pipeline is published and its initial/rerun completion logging is production-ready  
**Project ID:** `lafryhi-ai-radar-xprize`  
**Project number:** `1090908272413`  
**Region:** `us-central1`  
**Application prefix:** `lafryhi-ai-radar`

## Resource plan

| Resource | Planned name | Location | Purpose |
|---|---|---|---|
| Google Cloud project | `lafryhi-ai-radar-xprize` | project-wide | Isolated staging owner and billing boundary |
| Cloud Run service | `lafryhi-ai-radar` | `us-central1` | Single private staging application surface |
| Cloud Run runtime identity | `lafryhi-ai-radar-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com` | project-wide | Dedicated ADC identity for Firestore, Vertex AI, the operator secret, and logs |
| Firestore database | `(default)`, Standard edition, Native mode | `us-central1` | Created and ready; source, run, analysis, review, and Radar records |
| Secret Manager secret | `lafryhi-ai-radar-operator-token` | global | Created with one active version; temporary operator access token |
| Vertex AI model | `gemini-2.5-flash` | `us-central1` | Grounded structured analysis |
| Artifact Registry repository | `lafryhi-ai-radar`, Docker, Standard | `us-central1` | Created for the single Checkpoint 6 container image |

Cloud Logging is part of the runtime evidence path. No scheduler, Pub/Sub, Tasks, BigQuery, Firebase, custom domain, continuous deployment, or additional application service is planned.

## Confirmed Checkpoint 6 deployment

Confirmed on July 24, 2026:

- Production build: `npm run build`
- Container start: `node server.js`
- Listening port: `8080`
- Dockerfile: existing multi-stage Node 22 Alpine build using Next.js standalone output
- Runtime variables: `PERSISTENCE_ADAPTER=firestore`, `AI_ADAPTER=vertex`, `GOOGLE_CLOUD_PROJECT=lafryhi-ai-radar-xprize`, `GOOGLE_CLOUD_LOCATION=us-central1`, `GEMINI_MODEL=gemini-2.5-flash`, `VERTEX_TIMEOUT_MS=60000`, `GEMINI_MAX_OUTPUT_TOKENS=2048`, and `FIRESTORE_DATABASE_ID=(default)`
- Secret binding: `OPERATOR_ACCESS_TOKEN` references `lafryhi-ai-radar-operator-token`, version `1`
- Artifact Registry: exactly one Docker repository, `lafryhi-ai-radar`, created in `us-central1`
- Cloud Build: `37390bc2-13a3-4923-94fc-206e22c9853f`, status `SUCCESS`, duration 2 minutes 12 seconds
- Image: `us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:checkpoint6`
- Image digest: `sha256:cedc5487f4ba63799bb17c4f88093a29ad2b6034d57eeeb62e92b83ec81d4efa`
- Cloud Run revision: `lafryhi-ai-radar-00001-4tp`, Ready, serving 100% of traffic
- Service URLs: `https://lafryhi-ai-radar-1090908272413.us-central1.run.app` and canonical status URL `https://lafryhi-ai-radar-c5a4cs6xgq-uc.a.run.app`
- Authentication: private; no `allUsers` or `allAuthenticatedUsers` invoker binding
- Scaling and billing controls: minimum instances `0`, maximum instances `1`, one CPU with request-only CPU allocation, 512 MiB memory, concurrency `10`, request timeout `120` seconds
- Runtime identity: `lafryhi-ai-radar-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com`

The workstation has neither Docker nor the Google Cloud CLI. The existing archive was uploaded to authenticated Cloud Shell and submitted once to Cloud Build. The service was deployed once from that image without enabling unauthenticated access.

An authenticated request to `/api/health` returned `status: ok`, `phase: 2`, `persistenceAdapter: firestore`, and `aiAdapter: vertex`. The same endpoint returned HTTP `403` without an identity token. Cloud Run logs show Next.js listening on `0.0.0.0:8080`, Ready state, and a successful startup TCP probe after one attempt; an error-severity query over the deployment window returned no entries.

## Confirmed Checkpoint 7 runtime validation

The Phase 1 application did not expose a safe route capable of exercising Firestore write/delete and Vertex AI without processing a real source. A narrowly scoped, operator-token-protected `POST /api/internal/diagnostics` route was therefore added. It is server-only, requires both Cloud Run authentication and the existing operator token, uses the deployed service identity through Application Default Credentials, and returns only bounded status metadata.

One corrective image was built and deployed:

- Cloud Build: `fb198e51-6861-4dd0-a0b8-848eb65f0c69`, `SUCCESS`, duration 1 minute 38 seconds
- Image: `us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:checkpoint7`
- Digest: `sha256:a17cd7ea923e9053862dfc2c0ff46d7d182fcdcbf16c357a4eb648bdfeb54246`
- Current revision: `lafryhi-ai-radar-00002-25b`, Ready and serving 100% of traffic

The single authenticated diagnostic invocation confirmed:

- Firestore write, read, value verification, deletion, and post-delete empty-collection verification
- Vertex AI model `gemini-2.5-flash` in `us-central1`, successful schema-validated response, 1,786 ms model latency
- Secret Manager binding usable by the application without disclosing or logging the value
- Structured Cloud Logging event `runtime_diagnostic_completed`, total diagnostic latency 3,461 ms
- No Cloud Run `ERROR`-or-higher entries in the 30-minute validation window
- No public Cloud Run IAM binding; the service remains private

## Confirmed Checkpoint 8 production pipeline

Exactly one source was ingested:

- Publisher: Google Cloud
- Canonical URL: `https://cloud.google.com/blog/products/ai-machine-learning/innovations-from-google-io-26-on-google-cloud`
- Publication date: May 20, 2026
- Content hash: `ea6bf5f1990faa89662342c3fdd05d0759ab3804575d2a75fe6c998bb8a0f86c`

The first production analysis exposed a genuine blocker: the adapter requested JSON MIME output but did not provide Gemini with the application schema. The adapter now passes the Zod-derived `AnalysisResult` JSON schema through `responseJsonSchema`. The 2,048-token response ceiling still truncated the structured result, so the existing validated maximum was raised to 4,096 tokens. No source was re-ingested; the protected rerun action reused the original source record.

Current deployment:

- Image: `us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:checkpoint8`
- Image digest: `sha256:321c958a0d4eb9a3e216862a48700640bb95ba58d44dabd63d3fa849c8cd0526`
- Cloud Build: `fdb57d77-302c-4e59-b01f-dec1436bed63`, `SUCCESS`, duration 1 minute 39 seconds
- Revision: `lafryhi-ai-radar-00004-747l`, Ready and serving 100% of traffic
- Gemini: `gemini-2.5-flash`, `us-central1`, strict schema validation passed
- Current output limit: 4,096 tokens

Firestore contains one source, one analysis, one approved review, and one published Radar item. The feed was verified through an authenticated request because the Cloud Run service remains private. Its canonical source URL, human-review label, and provenance IDs are present; operator secrets, normalized source text, prompts, and diagnostic records are absent.

## Confirmed Checkpoint 8.1 observability closure

Completion logging is centralized in `pipeline-events.ts` and is called after the final processing-run persistence boundary in both `runPipeline` and `rerunPipeline`. Every successful production run now emits `pipeline.completed` with:

- `executionKind`
- `sourceId`
- `runId`
- `analysisId`
- `processingMode` (`initial` or `rerun`)
- `model`
- `schemaValidationStatus`
- `persistenceStatus`
- `reviewStatus`
- `totalLatencyMs`
- `timestamp`

The schema is strict and does not accept or emit source bodies, prompts, model responses, tokens, authorization headers, credentials, or secret material.

A protected `POST /api/internal/pipeline/recovery` endpoint now validates recovery payloads before loading Gemini, persistence, or pipeline dependencies. Invalid JSON or invalid recovery fields return HTTP `400` and emit `pipeline.validation_rejected` at warning level. Valid real reruns use the existing pipeline. A separate `validate_completion_log` action emits an explicitly labeled `synthetic_validation` completion event without invoking Gemini or writing Firestore.

Deployment:

- Cloud Build ID: `3645315d-9465-4cdf-b331-ea407a755b77`
- Cloud Build result: `SUCCESS`, duration 1 minute 33 seconds
- Image: `us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:checkpoint8-1`
- Image digest: `sha256:8a6d38fceabf1924cb2946729f04ba576aa9cada196e014ecb73298075472ee5`
- Revision: `lafryhi-ai-radar-00005-vb6`, Ready and serving 100% of traffic

The authenticated non-persistent validation returned HTTP `400` for malformed recovery and HTTP `200` for the synthetic rerun completion check. Firestore counts were identical before and after: one source, three historical processing runs, one analysis, one approved review, and one Radar item. The service IAM policy remains empty and private.

## Required APIs

Enable only after explicit approval and only if not already enabled:

```text
run.googleapis.com
cloudbuild.googleapis.com
artifactregistry.googleapis.com
firestore.googleapis.com
aiplatform.googleapis.com
secretmanager.googleapis.com
logging.googleapis.com
```

`cloudbuild` and `artifactregistry` are required because Docker is not installed locally and source deployment is the selected build path.

All six requested Phase 2 APIs were enabled in Checkpoint 2. Google Cloud also enabled required dependency services automatically; see the evidence record.

## Confirmed Firestore configuration

- Database ID: `(default)`
- Edition: Standard
- Mode: Firestore Native
- Location: `us-central1` (Iowa)
- State: ready
- Created: July 24, 2026 at 07:17:46 UTC+1
- Security rules selected during creation: restrictive/deny by default
- Encryption: Google-managed
- Scheduled backups: disabled
- Collections: none created during Checkpoint 3

The location is immutable and matches the planned Cloud Run and Vertex AI region. Local adapter write/read validation is deferred because the workstation has no Application Default Credentials and Checkpoint 3 did not authorize IAM or credential setup.

## Confirmed Secret Manager configuration

- Secret name: `lafryhi-ai-radar-operator-token`
- Resource project number: `1090908272413`
- Versions: exactly one, version `1`, active
- Replication: automatic/Google-managed default
- Encryption: Google-managed
- Created: July 24, 2026 at approximately 07:21 UTC+1
- IAM access: `roles/secretmanager.secretAccessor` granted directly to the dedicated runtime identity in Checkpoint 5

The 64-character token was generated from 48 cryptographically secure random bytes and entered directly into Secret Manager. Its value was not printed, written to disk, saved in environment files, committed, or documented. The temporary in-memory value was cleared immediately after secret creation.

## Runtime configuration

Non-secret Cloud Run variables:

```text
PERSISTENCE_ADAPTER=firestore
AI_ADAPTER=vertex
GOOGLE_CLOUD_PROJECT=<selected project ID>
GOOGLE_CLOUD_LOCATION=us-central1
GEMINI_MODEL=gemini-2.5-flash
VERTEX_TIMEOUT_MS=60000
GEMINI_MAX_OUTPUT_TOKENS=4096
FIRESTORE_DATABASE_ID=(default)
```

Secret binding:

```text
OPERATOR_ACCESS_TOKEN=lafryhi-ai-radar-operator-token:1
```

Pin the Cloud Run environment-variable secret to version `1` for this staging revision. Rotate by adding a version and deploying a new revision; do not use `latest` silently.

## Confirmed minimum runtime IAM

Checkpoint 5 created one dedicated runtime service account:

`lafryhi-ai-radar-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com`

The following bindings are confirmed:

| Role | Scope | Reason |
|---|---|---|
| `roles/datastore.user` | selected project | Read/write application documents in Firestore |
| `roles/aiplatform.user` | selected project | Invoke the configured Vertex AI model |
| `roles/logging.logWriter` | selected project | Emit structured Cloud Logging records |
| `roles/secretmanager.secretAccessor` | operator secret only | Resolve the bound operator token |

No service-account key or JSON credential was created or downloaded. No human principal received a new role. The runtime identity was not granted Owner, Editor, Project Admin, Storage Admin, Service Account Admin, Firebase Admin, or a broad Secret Manager role.

The human deployer needs existing authority to enable services/create resources and `roles/iam.serviceAccountUser` on the runtime identity. These are deployment permissions, not runtime roles.

## Read-only discovery before changes

After the CLI is installed/authenticated:

```powershell
gcloud auth list --filter=status:ACTIVE --format="value(account)"
gcloud projects list --format="table(projectId,name,lifecycleState)"
gcloud config get-value project
gcloud run services list --project $PROJECT_ID --region us-central1
gcloud firestore databases list --project $PROJECT_ID
gcloud secrets list --project $PROJECT_ID --filter="name:lafryhi-ai-radar-operator-token"
gcloud iam service-accounts list --project $PROJECT_ID --filter="email:lafryhi-ai-radar-runtime"
gcloud artifacts repositories list --project $PROJECT_ID --location us-central1
gcloud services list --enabled --project $PROJECT_ID
```

The user must confirm the exact project before `gcloud config set project` or any command below.

## Approved-change command plan

These commands are a plan, not a record of execution:

```powershell
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com firestore.googleapis.com aiplatform.googleapis.com secretmanager.googleapis.com logging.googleapis.com --project $PROJECT_ID

gcloud iam service-accounts create lafryhi-ai-radar-runtime --display-name="LAFRYHI AI Radar Runtime" --project $PROJECT_ID

gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:lafryhi-ai-radar-runtime@$PROJECT_ID.iam.gserviceaccount.com" --role="roles/datastore.user"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:lafryhi-ai-radar-runtime@$PROJECT_ID.iam.gserviceaccount.com" --role="roles/aiplatform.user"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:lafryhi-ai-radar-runtime@$PROJECT_ID.iam.gserviceaccount.com" --role="roles/logging.logWriter"

gcloud firestore databases create --database="(default)" --location=us-central1 --type=firestore-native --project $PROJECT_ID

gcloud secrets create lafryhi-ai-radar-operator-token --replication-policy=automatic --project $PROJECT_ID
```

Generate and upload the secret without placing its value in command text, files, reports, or output:

```powershell
$tokenBytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Fill($tokenBytes)
[Convert]::ToBase64String($tokenBytes) | gcloud secrets versions add lafryhi-ai-radar-operator-token --data-file=- --project $PROJECT_ID
Clear-Variable tokenBytes
```

Grant the secret-specific binding:

```powershell
gcloud secrets add-iam-policy-binding lafryhi-ai-radar-operator-token --member="serviceAccount:lafryhi-ai-radar-runtime@$PROJECT_ID.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor" --project $PROJECT_ID
```

Confirmed private image deployment:

```powershell
gcloud run deploy lafryhi-ai-radar --image="us-central1-docker.pkg.dev/$PROJECT_ID/lafryhi-ai-radar/lafryhi-ai-radar:checkpoint6" --project $PROJECT_ID --region us-central1 --service-account="lafryhi-ai-radar-runtime@$PROJECT_ID.iam.gserviceaccount.com" --no-allow-unauthenticated --min=0 --max=1 --cpu=1 --memory=512Mi --concurrency=10 --timeout=120 --port=8080 --cpu-throttling --set-env-vars="PERSISTENCE_ADAPTER=firestore,AI_ADAPTER=vertex,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=us-central1,GEMINI_MODEL=gemini-2.5-flash,VERTEX_TIMEOUT_MS=60000,GEMINI_MAX_OUTPUT_TOKENS=2048,FIRESTORE_DATABASE_ID=(default)" --set-secrets="OPERATOR_ACCESS_TOKEN=lafryhi-ai-radar-operator-token:1"
```

The image was built once in Cloud Build from the uploaded archive and pushed to the existing `lafryhi-ai-radar` repository. Do not create a source-deploy repository.

## Firestore validation

Do not create a synthetic application record through the UI. Use one minimal, clearly named infrastructure probe only if needed, verify the read, and delete it immediately. The preferred validation is the real source pipeline, which writes all five real collections:

```text
sourceRecords
processingRuns
analysisResults
reviewDecisions
radarItems
```

## Vertex connectivity validation

Run one harmless connectivity request using the production adapter before the full source. Record the model, status, latency, token usage, and schema result. Do not log response bodies as evidence or hidden reasoning. Then process exactly one real allowed authoritative announcement.

## Cost and safety controls

- Cloud Run minimum instances `0`, maximum instances `2`, concurrency `10`.
- One CPU, 512 MiB memory, 120-second Cloud Run timeout.
- Vertex request timeout 60 seconds and maximum output 4,096 tokens.
- Fetch timeout 10 seconds, three redirects, 1 MB content limit.
- No scheduler, broad crawling, automatic unbounded retry, or minimum warm instance.
- Logs contain identifiers/metadata, not source bodies, tokens, cookies, or secrets.
- Configure a low monthly budget alert in Cloud Billing after selecting the project. A budget alert notifies; it does not cap or stop spend.

## Rollback

Cloud Run revisions are immutable. If the new revision fails, route 100% traffic to the last healthy revision. For this first staging deployment, disable traffic to the failed revision or delete only the new service after preserving required failure logs. Firestore and Secret Manager are not deleted as part of an application rollback.

## Phase 4 confirmed deployment

The private Operator Dashboard was deployed without changing the resource topology:

- Service: `lafryhi-ai-radar`
- Region: `us-central1`
- Revision: `lafryhi-ai-radar-00006-jbr`
- Image: `us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:phase4`
- Runtime identity unchanged
- Secret binding unchanged: `OPERATOR_ACCESS_TOKEN` from `lafryhi-ai-radar-operator-token:1`
- Minimum instances 0; maximum instances 1; one request-throttled CPU; 512 MiB; concurrency 10; timeout 120 seconds
- IAM policy contains no bindings; the service remains private

No database, collection, secret, service account, IAM role, repository, service, scheduled job, or public access binding was created.

## Phase 5 confirmed deployment

Source Management uses the existing service and identity:

- Revision: `lafryhi-ai-radar-00007-scd`
- Image: `us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:phase5`
- Runtime identity and Secret Manager binding unchanged
- Minimum instances 0, maximum instances 1, request-throttled CPU unchanged
- Cloud Run IAM policy still has no bindings

The application recognizes the new `sourceRegistry` Firestore collection through the existing repository abstraction. Deployment and validation did not create a registry document, database, secret, IAM role, service account, repository, service, scheduler, Pub/Sub resource, or worker.

## Phase 6 confirmed cloud configuration

Controlled RSS discovery was deployed without changing the main service topology:

- Cloud Build: `bb1c4955-b0ad-445c-af9a-2a00fe744a71`
- Image digest: `sha256:b18f031717e55cd9997c8c4db6f261d48c724f671e5c687dbf55fffdf16fbadb`
- Revision: `lafryhi-ai-radar-00008-64p`, 100% traffic
- Runtime identity and Secret Manager binding unchanged
- Minimum instances 0; service-level maximum instances 1; request-only CPU
- Cloud Run remains private

`cloudscheduler.googleapis.com` is enabled. One dedicated identity,
`lafryhi-ai-radar-scheduler@lafryhi-ai-radar-xprize.iam.gserviceaccount.com`,
has only service-level `roles/run.invoker` on `lafryhi-ai-radar`. The enabled
`lafryhi-ai-radar-rss-discovery` job runs daily at 08:00 UTC, uses OIDC with
the canonical service URL as audience, has a 120-second deadline, and one
retry. No public member, key, shared query secret, Pub/Sub resource, worker,
database, repository, or additional Cloud Run service was created.
