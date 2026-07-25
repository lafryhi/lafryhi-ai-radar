# Phase 2 Real Evidence Record

## Phase 7 deployment compatibility finding — July 24, 2026

- Cloud Build `d7d7587d-8586-4876-bcec-2ca89a58ce62`: `SUCCESS`
- Image tag: `us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:phase7`
- Image digest: `sha256:3248180d90ba66f44345259885c7eff0543cc82987ec908fcea388b79f9fe36d`
- Created revision: `lafryhi-ai-radar-00011-99l`
- Authenticated dashboard check on that revision: HTTP 500 because the legacy
  in-memory adapter copied a production summary longer than 160 characters into
  a strictly bounded decision key point
- Safety response: restored 100% traffic to healthy revision
  `lafryhi-ai-radar-00010-zmj`; authenticated dashboard then returned HTTP 200
- Firestore before/after counts were identical: candidates 10, analyses 3,
  reviews 3, processing runs 5, Radar items 1
- No pending candidate was processed and no publication occurred
- Local correction and regression test pass, but no second revision was
  deployed because the authorized Phase 7 deployment limit was one revision

## Phase 6.2 production-readiness closure — July 24, 2026

Phase 6.2 added three strict, safe structured lifecycle events to the existing
pipeline without changing its architecture or persistence model:

- `pipeline.started`
- `analysis.created`
- `review.pending_created`

The RSS candidate identifier is carried as optional safe context for candidate
processing. The event schemas exclude prompts, source/article bodies, raw model
responses, authorization data, cookies, credentials, tokens, and secrets.

The candidate-processing server action was also corrected so that its success
`redirect()` executes outside the processing `try/catch`. This prevents Next.js
redirect control flow from being classified as a processing failure.

Local validation passed: 12 test files and 55 tests, lint, typecheck, and the
Next.js 16.2.11 production build.

Confirmed deployment evidence:

- Cloud Build: `b801a661-2fe8-4340-975d-e2ab262652ab`, `SUCCESS`
- Image: `us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:phase6-2`
- Digest: `sha256:9f8b7f6435a1d0166a94adc95a322a7db0bd473c72eb73f483bc54df611dcf8e`
- Revision: `lafryhi-ai-radar-00010-zmj`, Ready, 100% traffic
- Service remains private with the scheduler service account as its only
  service-level invoker binding
- Dedicated runtime identity, Secret Manager, Firestore, scheduler,
  request-only CPU, minimum zero instances, and maximum one instance preserved

Exactly one existing pending candidate was used for the production validation:
`6293f9fc76ed0eba2de81dc29da122325d68c3fc4bdec4e0f8af196b4ded8280`,
“Ask an AI expert: What exactly is the full stack?”

The protected action returned HTTP 303 with `candidate=processed`. Vertex AI
Gemini `gemini-2.5-flash` completed in a 12,256 ms pipeline run with strict
schema validation passed. Firestore created one analysis
(`04069b10-6c54-410e-b1e7-f45887def0ef`) and one pending review
(`dff113cd-7f61-4ca7-ae3a-93af1be0d9ad`). The review queue and detail page
returned HTTP 200 and rendered matching provenance and separate AI/human
decision sections.

Cloud Logging recorded exactly one each, in order:
`pipeline.started`, `analysis.created`, `review.pending_created`,
`pipeline.completed`, and—after opening the review—
`operator.review_opened`. The validation window had zero `ERROR`-or-higher
entries and no sensitive-content indicators.

Counts changed as expected: candidates remained 10 with one pending candidate
becoming processed; analyses 2→3; reviews 2→3; processing runs 4→5; Radar items
remained 1; discovery runs remained 1. No discovery, approval, rejection, or
publication occurred.

**Status:** Checkpoints 1–8.1 confirmed; the real pipeline and safe initial/rerun completion observability are validated  
**Evidence rule:** Record only observed cloud output and real pipeline identifiers. Never add secrets, cookies, credentials, or fabricated placeholders presented as results.

## Confirmed local preparation

- Google Cloud CLI detection: not installed on July 24, 2026.
- Docker detection: not installed; Cloud Run source deployment is planned.
- Standalone build artifact: `.next/standalone/server.js` exists.
- Health endpoint: `/api/health`, dependency-free.
- Production container port: `8080`, with `PORT` and `HOSTNAME=0.0.0.0`.
- Runtime adapters: `PERSISTENCE_ADAPTER=firestore`, `AI_ADAPTER=vertex`.
- Prompt version: `radar-analysis-v1`.
- Vertex bounds: 60-second request timeout and 2,048 maximum output tokens by planned configuration.

## Cloud evidence

Confirmed project:

- Project ID: `lafryhi-ai-radar-xprize`
- Project number: `1090908272413`
- Billing: linked to an active free-trial billing account at Checkpoint 1 verification

Confirmed Firestore:

- Database ID: `(default)`
- Edition/mode: Standard, Firestore Native
- Location: `us-central1` (Iowa)
- State: ready
- Creation time shown by Console: July 24, 2026, 07:17:46 UTC+1
- Security rules: restrictive/deny by default
- Encryption: Google-managed
- No collection or test document was created in Checkpoint 3.

The existing Firestore adapter was used for a safe read attempt against a clearly test-named path, but the SDK stopped before a database read because the workstation has no Application Default Credentials. Exact result: `Error: Could not load the default credentials.` No write occurred and there was therefore no test data to remove. Adapter read/write validation remains pending until the Cloud Run service identity/IAM checkpoint or another approved ADC identity path.

Confirmed Secret Manager:

- Secret: `lafryhi-ai-radar-operator-token`
- Resource: `projects/1090908272413/secrets/lafryhi-ai-radar-operator-token`
- Version: exactly one active version (`1`)
- Encryption: Google-managed
- Secret value: remained undisclosed and was cleared from temporary process memory after submission
- Access grants: none added during Checkpoint 4

After execution, record:

| Field | Observed value |
|---|---|
| Project ID | `lafryhi-ai-radar-xprize` |
| Enabled APIs | Six requested APIs enabled; dependency list recorded below |
| Cloud Run service / region | `lafryhi-ai-radar`, `us-central1` |
| Cloud Run revision | `lafryhi-ai-radar-00002-25b`, Ready, 100% traffic |
| Service URL | `https://lafryhi-ai-radar-1090908272413.us-central1.run.app`; canonical status URL `https://lafryhi-ai-radar-c5a4cs6xgq-uc.a.run.app` |
| Runtime identity | `lafryhi-ai-radar-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com` |
| Runtime IAM roles and scope | Project: `roles/datastore.user`, `roles/aiplatform.user`, `roles/logging.logWriter`; operator secret only: `roles/secretmanager.secretAccessor` |
| Firestore database / location | `(default)`, Standard, Native, `us-central1`, ready |
| Secret name/version binding | `OPERATOR_ACCESS_TOKEN` → `lafryhi-ai-radar-operator-token`, version `1` |
| Artifact Registry repository | `lafryhi-ai-radar`, Docker, Standard, `us-central1` |
| Container image | `us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:checkpoint7` |
| Image digest | `sha256:a17cd7ea923e9053862dfc2c0ff46d7d182fcdcbf16c357a4eb648bdfeb54246` |
| Gemini model | `gemini-2.5-flash`, Vertex AI, `us-central1` |
| Connectivity latency/tokens/validation | 1,786 ms model latency; strict response schema passed; token metadata not returned by the diagnostic |
| Authoritative source URL | Pending |
| Source content hash | Pending |
| Processing run ID | Pending |
| Started/completed timestamps | Pending |
| Prompt version | Pending |
| Validation outcome | Pending |
| Total latency | 3,461 ms for the Checkpoint 7 diagnostic |
| Token/cost metadata | Pending |
| Review decision/time | Pending |
| Radar item ID | Pending |
| Public feed verification | Pending |
| Cloud Logging query/result | Structured `runtime_diagnostic_completed` entry at `2026-07-24T07:50:27.986376Z`; no `ERROR`-or-higher entries in the 30-minute window |
| Failures and corrections | Phase 1 lacked a safe deployed dependency diagnostic; one narrowly scoped protected route and one corrective revision were added |

## Command/result log

Append exact approved commands and redacted results here after execution. Do not record authentication tokens or secret payloads.

### Checkpoint 2 API result

Explicitly enabled:

- `run.googleapis.com`
- `cloudbuild.googleapis.com`
- `artifactregistry.googleapis.com`
- `firestore.googleapis.com`
- `aiplatform.googleapis.com`
- `secretmanager.googleapis.com`

Automatically enabled by Google Cloud as dependencies:

- `containerregistry.googleapis.com`
- `firebaserules.googleapis.com`
- `iam.googleapis.com`
- `iamcredentials.googleapis.com`
- `pubsub.googleapis.com`

### Checkpoint 3 Firestore result

The Console inventory contained no database before creation. Exactly one database was created with ID `(default)`, Standard edition, Native mode, restrictive rules, and regional location `us-central1`. The post-create inventory showed one ready database. No collection was created.

### Checkpoint 4 Secret Manager result

The Secret Manager inventory contained no secrets before creation. Exactly one secret named `lafryhi-ai-radar-operator-token` was created using default automatic replication and Google-managed encryption. The versions view confirmed version `1` is active and is the only version. No IAM access was granted during Checkpoint 4. The secret payload was never emitted to terminal/tool output, files, documentation, screenshots, or source control.

### Checkpoint 5 runtime IAM result

The active project was verified as `lafryhi-ai-radar-xprize`. Exactly one dedicated service account, `lafryhi-ai-radar-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com`, was created for the future Cloud Run runtime.

The project policy grants that identity only `roles/datastore.user` for Firestore document access, `roles/aiplatform.user` for Vertex AI invocation, and `roles/logging.logWriter` for application log writes. The `lafryhi-ai-radar-operator-token` secret policy separately grants it `roles/secretmanager.secretAccessor`; the Secret Manager permissions view confirmed this is a direct, non-inherited secret-level binding.

No service-account key was created or downloaded, no JSON credential was produced, no human permissions were added, and no Owner, Editor, Project Admin, Storage Admin, Service Account Admin, Firebase Admin, or wildcard role was assigned to the runtime identity. No Cloud Run deployment or Firestore data operation occurred.

### Checkpoint 6 build, deployment, and startup validation

The active project was re-verified as `lafryhi-ai-radar-xprize` (project number `1090908272413`). Repository inspection confirmed the existing Dockerfile builds the Next.js standalone application with Node 22, starts it with `node server.js`, and listens on port `8080`.

Local validation results:

- `npm.cmd test`: passed — 5 test files, 10 tests
- `npm.cmd run lint`: passed — no findings
- Initial parallel `npm.cmd run typecheck`: failed with `.next/types/validator.ts(5,50): error TS2305: Module '"./routes.js"' has no exported member 'AppRouteHandlerRoutes'.` This was a generated-output race while `next build` was running concurrently.
- Serial `npm.cmd run typecheck` after the build: passed
- `npm.cmd run build`: passed — Next.js 16.2.11 production build completed and emitted `/`, `/api/health`, `/operator`, and `/operator/login`

Artifact Registry initially contained no repositories. Exactly one Standard Docker repository named `lafryhi-ai-radar` was created in `us-central1` with Google-managed encryption. Vulnerability scanning remains disabled because its separate API was not enabled.

Neither Docker nor `gcloud` is installed on the workstation. After Chrome file-URL access was enabled, the existing archive `lafryhi-ai-radar-checkpoint6.tar.gz` uploaded successfully to `/home/lafryhi766/` in authenticated Cloud Shell and extracted with its Dockerfile intact.

Exactly one Cloud Build was submitted:

- Build ID: `37390bc2-13a3-4923-94fc-206e22c9853f`
- Status: `SUCCESS`
- Duration: 2 minutes 12 seconds
- Image: `us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:checkpoint6`
- Digest: `sha256:cedc5487f4ba63799bb17c4f88093a29ad2b6034d57eeeb62e92b83ec81d4efa`

Exactly one Cloud Run service and one revision were created:

- Service: `lafryhi-ai-radar`
- Region: `us-central1`
- Revision: `lafryhi-ai-radar-00001-4tp`
- Runtime identity: `lafryhi-ai-radar-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com`
- Minimum instances: `0`
- Maximum instances: `1`
- CPU: `1`, allocated only while processing requests
- Memory: `512 MiB`
- Concurrency: `10`
- Request timeout: `120` seconds
- Secret reference: `OPERATOR_ACCESS_TOKEN` uses `lafryhi-ai-radar-operator-token`, version `1`; no payload value was displayed

Validation results:

- Service condition: `True`; revision Ready and serving 100% of traffic
- Authenticated `GET /api/health`: `{"status":"ok","service":"lafryhi-ai-radar","phase":2,"persistenceAdapter":"firestore","aiAdapter":"vertex"}`
- Unauthenticated `GET /api/health`: HTTP `403`
- Service IAM policy contained no public invoker binding
- Startup logs: Next.js 16.2.11 listened on `0.0.0.0:8080`, reported Ready, and passed the startup TCP probe on the first attempt
- Error query: no Cloud Run log entries with severity `ERROR` or higher during the deployment window

No public access, service-account key, human IAM grant, additional Firestore database, real source record, or second Cloud Run revision was created.

### Checkpoint 7 private runtime validation

Pre-validation inspection confirmed that the deployed Phase 1 application had no safe endpoint that could perform the required Firestore write/read/delete and minimal Vertex call without ingesting a source. A narrowly scoped diagnostic was added behind both Cloud Run authentication and the existing operator-token guard. The implementation uses the same Firestore and Vertex configuration as the production pipeline and emits bounded structured metadata without source bodies, generated response bodies, tokens, or credentials.

Local validation before the corrective image:

- `npm.cmd test`: passed — 6 test files, 12 tests
- `npm.cmd run lint`: passed — no findings
- `npm.cmd run typecheck`: passed
- `npm.cmd run build`: passed — Next.js 16.2.11 production build included `/api/internal/diagnostics`

Corrective build and deployment:

- Build ID: `fb198e51-6861-4dd0-a0b8-848eb65f0c69`
- Build status/duration: `SUCCESS`, 1 minute 38 seconds
- Image: `us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:checkpoint7`
- Digest: `sha256:a17cd7ea923e9053862dfc2c0ff46d7d182fcdcbf16c357a4eb648bdfeb54246`
- Revision: `lafryhi-ai-radar-00002-25b`, Ready, 100% traffic
- Runtime identity: `lafryhi-ai-radar-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com`

Exactly one authenticated diagnostic invocation completed:

- Authenticated invocation: `ok`
- Firestore diagnostic ID: `checkpoint7-runtime-validation`
- Firestore result: write/read values verified, document deleted, post-delete read absent, and `_runtimeDiagnostics` collection empty
- Independent Firestore REST listing after the run: empty response (`{}`)
- Vertex model/region: `gemini-2.5-flash`, `us-central1`
- Vertex result: `ok`; strict schema validation passed
- Vertex latency: 1,786 ms
- Response evidence retained: only the paraphrase “Model returned the required minimal connectivity acknowledgement.”
- Total diagnostic latency: 3,461 ms
- Secret access: validated through the configured Secret Manager-backed environment binding; no secret value, hash, substring, or comparison output was emitted

Cloud Logging contained a structured `runtime_diagnostic_completed` event at `2026-07-24T07:50:27.986376Z`. Its fields were limited to diagnostic ID, component status booleans, model, region, and latency. A query for Cloud Run entries at severity `ERROR` or higher over the 30-minute validation window returned an empty result.

The Cloud Run service IAM policy returned no bindings, so neither `allUsers` nor `allAuthenticatedUsers` has access. The service remains private. No new IAM role, service account, secret, database, repository, service, permanent test data, real source record, or credential was created. One new revision was created because the existing application lacked the required safe validation workflow.

### Checkpoint 8 real-source pipeline

Source evidence:

- Publisher: Google Cloud
- Stored title: `Innovations from Google I/O 26 on Google Cloud | Google Cloud | Google Cloud Blog`
- Canonical URL: `https://cloud.google.com/blog/products/ai-machine-learning/innovations-from-google-io-26-on-google-cloud`
- Publication date: `2026-05-20T00:00:00.000Z`
- Retrieval: HTTP `200`, `text/html; charset=utf-8`, 284,480 bytes
- Source ID: `b2c7baa8-69c8-49a3-9e80-21ee8ce91808`
- Content hash: `ea6bf5f1990faa89662342c3fdd05d0759ab3804575d2a75fe6c998bb8a0f86c`

The first run failed with `Gemini returned malformed JSON.` No analysis, review, or Radar item was created. This exposed a real production defect: the adapter set `responseMimeType` but did not send the existing application schema to Gemini. The adapter was corrected to pass the Zod-derived JSON schema through `responseJsonSchema`.

Corrective build:

- Local tests: 6 files, 13 tests passed
- Lint, typecheck, and production build: passed
- Cloud Build ID: `fdb57d77-302c-4e59-b01f-dec1436bed63`
- Cloud Build status/duration: `SUCCESS`, 1 minute 39 seconds
- Image: `us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:checkpoint8`
- Digest: `sha256:321c958a0d4eb9a3e216862a48700640bb95ba58d44dabd63d3fa849c8cd0526`

Revision `lafryhi-ai-radar-00003-d95` deployed the schema correction. A protected rerun still reached the 2,048-token output ceiling and produced no analysis. The configured limit was increased to the adapter’s existing validated maximum of 4,096, creating revision `lafryhi-ai-radar-00004-747l`. This revision is Ready and serves 100% of traffic.

Successful run and analysis:

- Processing run ID: `a08fe868-0fb1-4d48-9561-41e7ea3adcbd6`
- Model: `gemini-2.5-flash`
- Region: `us-central1`
- Prompt version: `radar-analysis-v1`
- Run status: `pending_review`
- Schema validation: `passed`
- Run latency: 18,016 ms
- Total tokens: 65,737
- Analysis ID: `48c1ccc4-6d89-45ea-852d-09dcaf9091ea`
- Category: `platform_update`
- Relevance: 75/100
- Confidence: 100/100
- Evidence entries: 5
- Warnings: 1
- Opportunity: `false`

Human review and publication:

- Initial review status: `pending`
- Review ID: `3959fa09-d4a9-4ea9-9886-90a9a8bcfecc`
- Final status: `approved`
- Reviewed at: `2026-07-24T08:49:35.789Z`
- Radar item ID: `2e6715b2-c8c1-427c-8979-bae127851db5`
- Publication state: `published`
- Authenticated feed request: HTTP `200`
- Feed checks: title present, canonical URL present, human-review label present
- Sensitive-marker check: no operator-token name, normalized source body, raw prompt marker, or runtime-diagnostic ID present
- Duplicate check: exactly one `sourceRecords` document and one `analysisResults` document

Cloud Logging evidence:

- Structured `review.approved` event recorded at `2026-07-24T08:49:35.959922Z` with the analysis and Radar item IDs.
- Successful protected POST request logs cover the source submission, corrected analysis rerun, and approval.
- The original `pipeline.failed` event is retained as genuine failure evidence.
- The existing `rerunPipeline` implementation does not emit a structured success event, so Gemini and persistence success are confirmed by the validated `processingRuns`, `analysisResults`, and `reviewDecisions` Firestore records rather than a dedicated success log.
- Three `ERROR` HTTP 500 request logs exist from two invalid server-action identifier attempts and one incorrectly formed action field during recovery. They did not invoke the pipeline or create records.
- A log query for operator-token, authorization-header, and operator-header markers returned no entries.

The service IAM policy remains empty, with no `allUsers` or `allAuthenticatedUsers` binding. No IAM role, service account, secret, database, repository, or additional service was created.

### Checkpoint 8.1 observability evidence

Root cause:

- `runPipeline` emitted an inline completion event, but `rerunPipeline` returned after persistence without logging completion.
- Direct recovery attempts used Next.js server-action transport. Malformed identifiers or form fields were rejected by the framework before application validation and surfaced as HTTP 500.

Implementation:

- Added one shared `pipeline.completed` logger with a strict event schema.
- Initial and rerun paths call the same logger only after source/run/analysis/review persistence succeeds.
- Added protected `POST /api/internal/pipeline/recovery` with strict request validation.
- Invalid payloads return HTTP `400` and emit `pipeline.validation_rejected` with only endpoint, reason, status, and timestamp.
- Added an explicitly labeled, non-persistent `synthetic_validation` action for safe runtime evidence.

Local validation:

- `npm.cmd test`: passed — 7 files, 18 tests
- `npm.cmd run lint`: passed
- `npm.cmd run typecheck`: passed
- `npm.cmd run build`: passed — Next.js 16.2.11, including `/api/internal/pipeline/recovery`

Deployment evidence:

- Cloud Build: `3645315d-9465-4cdf-b331-ea407a755b77`
- Status/duration: `SUCCESS`, 1 minute 33 seconds
- Image: `us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:checkpoint8-1`
- Digest: `sha256:8a6d38fceabf1924cb2946729f04ba576aa9cada196e014ecb73298075472ee5`
- Revision: `lafryhi-ai-radar-00005-vb6`, Ready, 100% traffic
- Runtime identity unchanged: `lafryhi-ai-radar-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com`

Authenticated non-persistent validation:

- Malformed request: HTTP `400`, `{"error":"Invalid recovery request."}`
- Synthetic completion request: HTTP `200`, `{"status":"ok","validation":"synthetic_validation"}`
- Firestore before: 1 source, 3 processing runs, 1 analysis, 1 review, 1 Radar item
- Firestore after: 1 source, 3 processing runs, 1 analysis, 1 review, 1 Radar item
- No Gemini call, source ingestion, analysis persistence, review mutation, or publication occurred

Cloud Logging:

- `pipeline.completed` recorded at `2026-07-24T09:23:39.091535Z`.
- The event explicitly records `executionKind: synthetic_validation`, `processingMode: rerun`, `schemaValidationStatus: passed`, `persistenceStatus: not_persisted_diagnostic`, and `reviewStatus: not_applicable`.
- `pipeline.validation_rejected` recorded at `2026-07-24T09:23:38.899335Z` with HTTP status 400 and warning severity.
- Revision-scoped `severity>=ERROR` query: no entries.
- Revision-scoped secret/credential marker query: no entries.
- Historical Checkpoint 8 failures and HTTP 500 logs were retained unchanged.

Privacy and record integrity:

- Cloud Run IAM policy: no bindings; no `allUsers` or `allAuthenticatedUsers`.
- Exactly one new Cloud Run revision was created.
- No second real source was processed.
- No duplicate source, run, analysis, review, or Radar item was created.
- The approved Radar item was not altered.

## Manual screenshot checklist

Capture manually after real execution:

1. Selected project and enabled API list.
2. Cloud Run service, region, active revision, service identity, scaling limits, and secret binding name.
3. Firestore database location and the five real pipeline documents/collections, with sensitive or excessive text redacted.
4. Vertex AI request/usage evidence for the recorded model and time.
5. Operator analysis screen with canonical source, structured analysis, exact evidence excerpts, validation state, and run ID.
6. Human approval decision.
7. Public Radar item with source link, scores, human-review label, and traceability IDs.
8. Cloud Logging entries for the same run and item IDs.
9. A signed-out operator URL redirecting to the temporary login guard.

## Phase 4 Operator Dashboard evidence

Build and deployment:

- Local tests: 9 files and 26 tests passed
- Lint, typecheck, and production build passed
- Single archive: `.phase4/lafryhi-ai-radar-phase4.tar.gz`
- Cloud Build ID: `1c3d3f7a-0464-46c5-b138-f279e3fe5190`
- Cloud Build status/duration: SUCCESS, 2 minutes 14 seconds
- Container image: `us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:phase4`
- Digest: `sha256:85ad0b52932f339f2acba91977bfebffa0e260935b34b717e44f5e4d443c6ff4`
- Revision: `lafryhi-ai-radar-00006-jbr`
- Service identity: `lafryhi-ai-radar-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com`
- IAM policy output contained only version and etag, with no members or bindings

Read-only live validation:

- Unauthenticated Cloud Run request: HTTP 403
- Authenticated Cloud Run request without operator cookie: HTTP 307 to `/operator/login`
- Fully authenticated `/operator`: HTTP 200 with dashboard heading
- Fully authenticated existing review detail: HTTP 200
- Review detail contained explicit AI-generated analysis and human-decision sections
- Existing Radar item ID was displayed through provenance
- Rendered-output sensitive-marker check returned no match
- Structured `operator.dashboard_viewed` and `operator.review_opened` events appeared in Cloud Logging
- Revision-scoped ERROR-or-higher query returned no entries
- Revision-scoped authorization, private-key, operator-token-field, raw-prompt, and normalized-source marker query returned no entries

Production record integrity after validation:

- `sourceRecords`: 1
- `processingRuns`: 3
- `analysisResults`: 1
- `reviewDecisions`: 1
- `radarItems`: 1

No approval, rejection, rerun, ingestion, Gemini invocation, Firestore mutation, or temporary record was used for live Phase 4 validation.

## Phase 5 Source Management evidence

Build and deployment:

- Local validation: 11 test files and 33 tests passed; lint, typecheck, and build passed
- Cloud Build: `24b77e65-0014-4736-b029-eb43f36e0f24`
- Status/duration: SUCCESS, 2 minutes 45 seconds
- Image digest: `sha256:89ad9da701f8996b3e5c995e05d50529d3c60c6f45a1d2eb753da4e14341e740`
- Revision: `lafryhi-ai-radar-00007-scd`
- Runtime identity unchanged
- Cloud Run IAM policy contained no members or bindings

Authenticated safe validation:

- `/operator/sources`: HTTP 200
- Source Management heading and explicit empty-registry state present
- Protected intake of an unregistered URL: HTTP 400 with safe `Source is not registered` response
- Retrieval, Gemini, and persistence were not invoked
- Cloud Logging recorded `source.validation_failed`, canonical domain `cloud.google.com`, reason `not_registered`
- Revision-scoped ERROR-or-higher query: no entries
- Secret/header/prompt/source-body marker query: no entries

Firestore after validation:

- `sourceRegistry`: 0
- `sourceRecords`: 1
- `processingRuns`: 3
- `analysisResults`: 1
- `reviewDecisions`: 1
- `radarItems`: 1

No source registry entry, article, run, analysis, review, Radar item, temporary record, scheduler, crawler, worker, topic, subscription, or cloud resource was created during validation.

## Phase 6 Controlled RSS Discovery evidence

Build and deployment:

- Local: 12 test files and 53 tests passed; lint, typecheck, and build passed
- Cloud Build: `bb1c4955-b0ad-445c-af9a-2a00fe744a71` (`SUCCESS`, 2m43s)
- Image: `us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:phase6`
- Digest: `sha256:b18f031717e55cd9997c8c4db6f261d48c724f671e5c687dbf55fffdf16fbadb`
- Revision: `lafryhi-ai-radar-00008-64p`, Ready, 100% traffic
- Service cap: minimum 0, service-level maximum 1
- Runtime identity and operator secret binding unchanged

Authenticated schedule:

- API: `cloudscheduler.googleapis.com`
- Job: `lafryhi-ai-radar-rss-discovery`, enabled, `us-central1`
- Schedule: daily 08:00 UTC
- OIDC identity: `lafryhi-ai-radar-scheduler@lafryhi-ai-radar-xprize.iam.gserviceaccount.com`
- IAM: service-level `roles/run.invoker` only
- No `allUsers`, `allAuthenticatedUsers`, shared query token, or key

Safe live validation:

- Anonymous root: HTTP 403
- Authorized `/operator/sources`: HTTP 200
- Manual action without operator token: HTTP 401
- Scheduled route without scheduler headers: HTTP 401
- Memory-only diagnostic: accepted one candidate, then identified the same item as one duplicate; zero publications
- Structured RSS start/accept/duplicate/completion and unauthorized-schedule events present
- Revision-scoped application ERROR-or-higher entries: none
- No secret or credential value found in inspected application logs

Firestore remained unchanged at `sourceRegistry=0`, `sourceRecords=1`,
`processingRuns=3`, `analysisResults=1`, `reviewDecisions=1`, `radarItems=1`,
`rssCandidates=0`, and `rssDiscoveryRuns=0`. No external feed, second real
source, Gemini request, publication, production mutation, or temporary record
was used for live validation.

## Phase 6.1 Founding Trusted Sources evidence

The operator explicitly approved and registered five sources through the
protected Source Management server action:

- Google AI Updates
- Google DeepMind News
- NVIDIA Deep Learning
- Hugging Face Blog
- Mistral AI News

Governance validation:

- duplicate normalized feed URL rejection implemented;
- safe registration verified/rejected events implemented;
- 12 test files and 55 tests passed;
- lint, typecheck, and production build passed;
- no dependency or Firestore collection added.

Deployment:

- Cloud Build `73ec3c97-ed1b-40bb-8605-155b65ce2046`, `SUCCESS`, 2m15s
- Image digest `sha256:f2544780be3127e0ae908c661c4220d3143e5cbbff704031cc2a93f3d07174ac`
- Revision `lafryhi-ai-radar-00009-n45`, Ready, 100% traffic
- Runtime identity, Secret Manager integration, private IAM, and 0/1 scaling
  preserved

Registration evidence:

- `sourceRegistry`: 0 to 5
- five unique canonical domains and five unique normalized feed URLs
- every record Official, Enabled, and `requiresHumanReview=true`
- five `source.registration_verified` events
- no registration-rejected event was needed for the approved batch

One bounded Google AI Updates discovery produced run
`353333eb-16bb-430e-92c3-8dad0620debc`: success, 20 examined, 10 accepted,
zero duplicates, 10 bounded skips, and zero validation failures. All candidates
remain pending and have no source-record reference.

Post-run counts were `sourceRecords=1`, `processingRuns=3`,
`analysisResults=1`, `reviewDecisions=1`, and `radarItems=1`, unchanged from
before registration. No Gemini invocation, article processing, analysis,
review, approval, or publication occurred.
