# Deployment Readiness Audit

Audit date: 2026-08-03  
Audited implementation baseline: `e997c2faa011cd3d37eef9ab8c48e1a0be360ffb`  
Scope: non-payment deployment readiness only  
Verdict: **READY_FOR_SAFE_NON_PAYMENT_DEPLOYMENT**

This verdict means both existing services can be deployed with `PAYMENT_MODE=disabled` after the owner supplies the explicitly marked identity and image inputs. It does not approve a payment, wallet, Marketplace listing, production idempotency mechanism, or Circle configuration.

## 1. Confirmed deployment topology

| Component                                  | Confirmed repository configuration                                                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Google Cloud project                       | `lafryhi-ai-radar-xprize`                                                                                                                                                                  |
| Region                                     | `us-central1`                                                                                                                                                                              |
| Artifact Registry repository used by Radar | `lafryhi-ai-radar`                                                                                                                                                                         |
| Main service                               | `lafryhi-ai-radar`                                                                                                                                                                         |
| Main runtime identity                      | `lafryhi-ai-radar-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com`                                                                                                                 |
| Main image template                        | `us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:<IMMUTABLE_TAG_OR_DIGEST>`                                                                           |
| Main ingress                               | `all`; the public application remains reachable                                                                                                                                            |
| Main resources                             | Node 22, port 8080, non-root, 1 CPU, 512 MiB, concurrency 10, timeout 120 seconds, maxScale 1                                                                                              |
| Main persistence / AI                      | Firestore and Vertex AI                                                                                                                                                                    |
| Main export route                          | `GET /api/internal/agent-services/published-radar-export`                                                                                                                                  |
| Confirmed Radar URL                        | `https://lafryhi-ai-radar-1090908272413.us-central1.run.app` (must be re-confirmed after deployment)                                                                                       |
| Seller service template                    | `lafryhi-x402-seller`                                                                                                                                                                      |
| Seller image                               | `us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-x402-seller:<IMMUTABLE_TAG_OR_DIGEST>` proposed in the already confirmed repository; owner must approve reuse |
| Seller ingress                             | `all`, required for future buyers; application payment boundary protects fulfillment                                                                                                       |
| Seller resources                           | Node 22, port 8080, non-root, 1 CPU, 512 MiB, concurrency 10, timeout 30 seconds, minScale 0, maxScale 1                                                                                   |
| Seller health path                         | `/health`                                                                                                                                                                                  |

The Radar Docker build copies the committed repository before `npm run build`; root TypeScript now explicitly excludes the independently deployed seller. A clean image build from `e997c2f` passed. `cloudbuild.yaml` builds the supplied context and accepts `_IMAGE`. The seller has its own Dockerfile and lifecycle; no seller Cloud Build file exists.

## 2. Exact deployment gaps

### Radar

- Add `RADAR_EXPORT_AUDIENCE` and `RADAR_EXPORT_SELLER_SERVICE_ACCOUNT` only when enabling authorized export access.
- Keep `RADAR_EXPORT_LOCAL_AUTH_ENABLED=false` in production and omit `RADAR_EXPORT_LOCAL_SECRET`.
- No new production secret is required for Google identity-token authorization.
- The export has no separate enable variable. It is fail-closed while audience or allowed caller email is absent: every request returns `401`.
- Public ingress is compatible with application-level Google token verification. The existing public product cannot be made service-level private without affecting browser traffic.
- Repository files do not prove the live `roles/run.invoker` policy. If `allUsers` currently invokes Radar, no additional seller invoker binding is required; the route itself verifies audience and seller email. If the live service is not publicly invokable, grant the seller identity `roles/run.invoker` without removing required public access. This is an owner verification, not an assumed mutation.

### Seller

- The template service name is `lafryhi-x402-seller`.
- `REPLACE_WITH_DEDICATED_SELLER_SERVICE_ACCOUNT` and the immutable image reference must be resolved.
- `RADAR_EXPORT_URL` and `RADAR_EXPORT_AUDIENCE` are required at startup in HTTP content mode but are missing from the seller manifest template.
- The wallet Secret Manager reference in the template is unnecessary and should not be supplied for a non-payment deployment. With `PAYMENT_MODE=disabled`, wallet, network, and facilitator values are not required.
- The seller uses `InMemoryFulfillmentRepository`; this is acceptable only while payment is disabled because no verified payment can create fulfillment. Durable atomic idempotency is mandatory before payment activation.
- The seller does not fetch Radar content during startup, health, or metadata calls. There is no payment-free diagnostic endpoint that exercises its content adapter. Therefore seller-originated content retrieval cannot be objectively proven through the public API before payment verification; mark it `PENDING_REAL_PROOF` and do not add a feature merely for this audit.

## 3. Least-privilege identity and IAM plan

| Identity                      | Purpose                                            | Minimum plan                                                                                                       |
| ----------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Existing Radar runtime        | Firestore, Vertex AI, existing application runtime | Retain current identity and live roles; do not reuse for seller                                                    |
| Dedicated seller runtime      | Run seller and mint its own Google identity token  | `lafryhi-x402-seller-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com`; verified role-free at project level |
| Existing Cloud Build identity | Build and publish images                           | Retain existing build/push permissions; exact principal and roles are not determined by repository files           |

Intended call:

```text
lafryhi-x402-seller
  -- Google-signed ID token, aud = Radar service URL
  --> lafryhi-ai-radar/api/internal/agent-services/published-radar-export
      -- verifies aud and exact seller service-account email
```

- Token audience: exact canonical Radar service origin, currently `https://lafryhi-ai-radar-1090908272413.us-central1.run.app`; confirm from the deployed service before setting it.
- Caller email: exact dedicated seller service-account email.
- Radar environment: `RADAR_EXPORT_AUDIENCE=<RADAR_SERVICE_ORIGIN>` and `RADAR_EXPORT_SELLER_SERVICE_ACCOUNT=<SELLER_SA_EMAIL>`.
- Seller environment: `RADAR_EXPORT_AUDIENCE=<RADAR_SERVICE_ORIGIN>` and `RADAR_EXPORT_URL=<RADAR_SERVICE_ORIGIN>/api/internal/agent-services/published-radar-export`.
- `roles/run.invoker` on Radar for the seller is required only if live service-level IAM does not already permit invocation. Public `allUsers` invocation makes it redundant; application authorization still returns `401` for the protected route.
- Operator tokens authenticate the browser/operator workflow and Scheduler secrets authenticate scheduled RSS work. Neither establishes a Google workload identity, audience, or dedicated caller email, so neither is used here.

## 4. Secrets and configuration inventory

| Variable or secret                    | Service | Classification                             | Source                            | Required before non-payment deployment             | Safe placeholder                                                                          | Owner action                                               |
| ------------------------------------- | ------- | ------------------------------------------ | --------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Export enabled state                  | Radar   | Derived configuration                      | Application behavior              | No; absent audience/email fails closed             | `FAIL_CLOSED`                                                                             | Enable only by setting both production identity variables  |
| `RADAR_EXPORT_AUDIENCE`               | Radar   | Non-secret                                 | Deployed Radar URL                | Before authorized check                            | `OWNER_DECISION_REQUIRED_RADAR_ORIGIN`                                                    | Confirm exact origin                                       |
| `RADAR_EXPORT_SELLER_SERVICE_ACCOUNT` | Radar   | Non-secret identity                        | Dedicated seller SA               | Before authorized check                            | `lafryhi-x402-seller-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com`             | Re-confirm before deployment                               |
| `RADAR_EXPORT_LOCAL_AUTH_ENABLED`     | Radar   | Non-secret                                 | Manifest                          | Yes                                                | `false`                                                                                   | Keep false in production                                   |
| `RADAR_EXPORT_LOCAL_SECRET`           | Radar   | Secret, local only                         | Not applicable in production      | No                                                 | Omit                                                                                      | Never set in production                                    |
| Existing Operator token               | Radar   | Secret                                     | Existing Secret Manager reference | Existing service requirement                       | Do not display                                                                            | Preserve existing binding                                  |
| Existing Scheduler secret             | Radar   | Secret                                     | Existing Secret Manager reference | Existing service requirement                       | Do not display                                                                            | Preserve existing binding                                  |
| `RADAR_CONTENT_MODE`                  | Seller  | Non-secret                                 | Seller configuration              | Yes                                                | `http`                                                                                    | Set exactly `http`                                         |
| `RADAR_EXPORT_URL`                    | Seller  | Non-secret                                 | Radar route URL                   | Yes                                                | `OWNER_DECISION_REQUIRED_RADAR_ORIGIN/api/internal/agent-services/published-radar-export` | Confirm exact URL                                          |
| `RADAR_EXPORT_AUDIENCE`               | Seller  | Non-secret                                 | Radar service origin              | Yes                                                | `OWNER_DECISION_REQUIRED_RADAR_ORIGIN`                                                    | Must match Radar verifier exactly                          |
| Seller runtime service account        | Seller  | Identity                                   | Cloud IAM                         | Yes                                                | `lafryhi-x402-seller-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com`             | Re-confirm and attach                                      |
| `RADAR_EXPORT_LOCAL_TOKEN`            | Seller  | Secret, development only                   | None in production                | No                                                 | Omit                                                                                      | Never set in production                                    |
| `RADAR_EXPORT_TIMEOUT_MS`             | Seller  | Non-secret                                 | Existing example                  | Yes                                                | `8000`                                                                                    | Retain conservative default                                |
| `RADAR_EXPORT_MAX_RESPONSE_BYTES`     | Seller  | Non-secret                                 | Existing example                  | Yes                                                | `64000`                                                                                   | Retain cap                                                 |
| `PAYMENT_MODE`                        | Seller  | Non-secret safety switch                   | Manifest                          | Yes                                                | `disabled`                                                                                | Verify revision environment before traffic                 |
| `CIRCLE_FACILITATOR_URL`              | Seller  | Non-secret endpoint                        | Circle configuration              | No while disabled                                  | Omit                                                                                      | Decide only before controlled payment phase                |
| `SELLER_WALLET_ADDRESS`               | Seller  | Public address but sensitive configuration | Owner/Circle wallet               | No while disabled                                  | Omit                                                                                      | Do not create or configure in this phase                   |
| `ACCEPTED_NETWORKS`                   | Seller  | Non-secret                                 | Official Circle support           | No while disabled                                  | Omit                                                                                      | Verify officially before payment activation                |
| `SERVICE_PRICE_USD`                   | Seller  | Non-secret                                 | Existing product configuration    | Not functionally required while disabled           | `0.01`                                                                                    | Re-approve before payment activation                       |
| Service ID                            | Seller  | Non-secret constant                        | Application                       | Built in                                           | `lafryhi-ai-radar-decision-brief`                                                         | Verify metadata after deployment                           |
| Service version                       | Seller  | Non-secret constant                        | Application                       | Built in                                           | `1.0.0`                                                                                   | Verify metadata after deployment                           |
| Deployment hostname                   | Seller  | Non-secret                                 | Cloud Run after deployment        | No                                                 | `PENDING_REAL_PROOF`                                                                      | Record assigned URL                                        |
| Fulfillment repository mode           | Seller  | Operational control                        | Application                       | In-memory is acceptable only with payment disabled | `in-memory`                                                                               | Implement/configure durable atomic storage before payments |

## 5. Deployment command templates — do not run during this audit

All angle-bracket values are owner inputs. Commands are templates, not evidence of execution.

### A. One-time preparation

```powershell
# Confirm, do not assume, the existing Artifact Registry repository and Cloud Build principal.
gcloud artifacts repositories describe lafryhi-ai-radar --project=lafryhi-ai-radar-xprize --location=us-central1
gcloud projects get-iam-policy lafryhi-ai-radar-xprize --format=json

# Confirm the already-created, dedicated runtime identity.
gcloud iam service-accounts describe lafryhi-x402-seller-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com --project=lafryhi-ai-radar-xprize
```

### B. Radar build and deployment

```powershell
$RADAR_IMAGE="us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:<COMMIT>-<UTC_TIMESTAMP>"
gcloud builds submit . --project=lafryhi-ai-radar-xprize --config=cloudbuild.yaml --substitutions="_IMAGE=$RADAR_IMAGE"

# First deploy the committed image while export remains fail-closed.
gcloud run deploy lafryhi-ai-radar --project=lafryhi-ai-radar-xprize --region=us-central1 --image="$RADAR_IMAGE"

# After identity confirmation, enable exact application-level authorization.
gcloud run services update lafryhi-ai-radar --project=lafryhi-ai-radar-xprize --region=us-central1 --update-env-vars="RADAR_EXPORT_AUDIENCE=<OWNER_DECISION_REQUIRED_RADAR_ORIGIN>,RADAR_EXPORT_SELLER_SERVICE_ACCOUNT=lafryhi-x402-seller-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com,RADAR_EXPORT_LOCAL_AUTH_ENABLED=false"
```

Before using `gcloud run deploy`, compare the generated revision configuration with the existing service so service account, existing secrets, Firestore/Vertex settings, scaling, ingress, and public access remain unchanged. Prefer an owner-reviewed manifest or explicit flags if the CLI would otherwise alter them.

### C. Seller build and deployment

```powershell
$SELLER_IMAGE="us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-x402-seller:<COMMIT>-<UTC_TIMESTAMP>"
gcloud builds submit services/x402-seller --project=lafryhi-ai-radar-xprize --tag="$SELLER_IMAGE"

gcloud run deploy lafryhi-x402-seller --project=lafryhi-ai-radar-xprize --region=us-central1 --image="$SELLER_IMAGE" --service-account="lafryhi-x402-seller-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com" --ingress=all --allow-unauthenticated --port=8080 --cpu=1 --memory=512Mi --concurrency=10 --timeout=30s --min=0 --max=1 --set-env-vars="NODE_ENV=production,PAYMENT_MODE=disabled,RADAR_CONTENT_MODE=http,RADAR_EXPORT_URL=<OWNER_DECISION_REQUIRED_RADAR_ORIGIN>/api/internal/agent-services/published-radar-export,RADAR_EXPORT_AUDIENCE=<OWNER_DECISION_REQUIRED_RADAR_ORIGIN>,RADAR_EXPORT_TIMEOUT_MS=8000,RADAR_EXPORT_MAX_RESPONSE_BYTES=64000,REQUEST_TIMEOUT_MS=10000,MAX_REQUEST_BYTES=16384"
```

Do not add wallet, accepted-network, facilitator, or local-token configuration in this phase.

### D. Conditional IAM binding

```powershell
# Read first. If allUsers already has roles/run.invoker, do not add a redundant seller binding.
gcloud run services get-iam-policy lafryhi-ai-radar --project=lafryhi-ai-radar-xprize --region=us-central1

# Use only if service-level invocation requires it.
gcloud run services add-iam-policy-binding lafryhi-ai-radar --project=lafryhi-ai-radar-xprize --region=us-central1 --member="serviceAccount:lafryhi-x402-seller-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com" --role="roles/run.invoker"
```

### E. Configuration verification

```powershell
gcloud run services describe lafryhi-ai-radar --project=lafryhi-ai-radar-xprize --region=us-central1 --format=json
gcloud run services describe lafryhi-x402-seller --project=lafryhi-ai-radar-xprize --region=us-central1 --format=json
gcloud run revisions list --service=lafryhi-ai-radar --project=lafryhi-ai-radar-xprize --region=us-central1
gcloud run revisions list --service=lafryhi-x402-seller --project=lafryhi-ai-radar-xprize --region=us-central1
```

### F. Rollback

```powershell
gcloud run services update-traffic lafryhi-ai-radar --project=lafryhi-ai-radar-xprize --region=us-central1 --to-revisions=<OWNER_DECISION_REQUIRED_PREVIOUS_RADAR_REVISION>=100
gcloud run services update-traffic lafryhi-x402-seller --project=lafryhi-ai-radar-xprize --region=us-central1 --to-revisions=<OWNER_DECISION_REQUIRED_PREVIOUS_SELLER_REVISION>=100
```

If export authorization alone fails, remove `RADAR_EXPORT_AUDIENCE` and `RADAR_EXPORT_SELLER_SERVICE_ACCOUNT` or route traffic back; the route returns to fail-closed behavior. Never solve an authorization failure by enabling the local secret in production.

## 6. Safest deployment order

1. Re-run committed local builds/tests. Stop on any failure; no cloud state exists to roll back.
2. Confirm the dedicated seller identity remains present and role-free at project level.
3. Build Radar from the intended commit; record image digest. Deploy with export identity variables absent so the route fails closed. Roll back traffic if existing health/readiness regress.
4. Confirm Radar health/readiness and that unauthenticated export is `401`.
5. Build and deploy Seller with `PAYMENT_MODE=disabled`, `RADAR_CONTENT_MODE=http`, exact Radar URL/audience, and no wallet/Circle values. Roll back if startup, health, or metadata fails.
6. Read the live Radar IAM policy. Add seller invoker only if service-level policy requires it; otherwise make no IAM change.
7. Configure Radar audience and exact seller email, creating a new revision. Roll back or clear both values if authorization validation fails.
8. Test unauthorized, correct-identity, wrong-audience, and wrong-identity Radar calls.
9. Test Seller health and metadata. Confirm `NOT_LISTED`, `PENDING_REAL_PROOF`, and payment-disabled deployment state.
10. Record seller-originated production content retrieval as `PENDING_REAL_PROOF`; it cannot be exercised through the current public API without payment verification. Direct authorized export proves the contract and IAM boundary without payment.
11. Do not test unpaid x402 behavior as proof until Circle mode is intentionally configured in a later controlled phase. In the current disabled verifier, do not represent any response as live Circle `402` proof.

## 7. Read-only post-deployment checks

```powershell
# Public Radar checks
curl.exe -i <OWNER_DECISION_REQUIRED_RADAR_ORIGIN>/api/health
curl.exe -i <OWNER_DECISION_REQUIRED_RADAR_ORIGIN>/api/readiness

# Must return 401.
curl.exe -i "<OWNER_DECISION_REQUIRED_RADAR_ORIGIN>/api/internal/agent-services/published-radar-export?topic=AI&maximumItemCount=1"

# Obtain tokens only under an explicitly authorized operator that may impersonate test identities.
$GOOD_TOKEN = gcloud auth print-identity-token --impersonate-service-account=lafryhi-x402-seller-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com --audiences=<OWNER_DECISION_REQUIRED_RADAR_ORIGIN>
curl.exe -i -H "Authorization: Bearer $GOOD_TOKEN" "<OWNER_DECISION_REQUIRED_RADAR_ORIGIN>/api/internal/agent-services/published-radar-export?topic=AI&maximumItemCount=1"

# Must return 401: correct caller, wrong audience.
$WRONG_AUD_TOKEN = gcloud auth print-identity-token --impersonate-service-account=lafryhi-x402-seller-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com --audiences=https://invalid.example
curl.exe -i -H "Authorization: Bearer $WRONG_AUD_TOKEN" "<OWNER_DECISION_REQUIRED_RADAR_ORIGIN>/api/internal/agent-services/published-radar-export?topic=AI&maximumItemCount=1"

# Must return 401: wrong caller identity.
$WRONG_CALLER_TOKEN = gcloud auth print-identity-token --impersonate-service-account=<OWNER_DECISION_REQUIRED_WRONG_TEST_SA_EMAIL> --audiences=<OWNER_DECISION_REQUIRED_RADAR_ORIGIN>
curl.exe -i -H "Authorization: Bearer $WRONG_CALLER_TOKEN" "<OWNER_DECISION_REQUIRED_RADAR_ORIGIN>/api/internal/agent-services/published-radar-export?topic=AI&maximumItemCount=1"

# Public seller checks; no payment request.
curl.exe -i <OWNER_DECISION_REQUIRED_SELLER_ORIGIN>/health
curl.exe -i <OWNER_DECISION_REQUIRED_SELLER_ORIGIN>/service-metadata
```

Expected seller metadata must remain truthful: deployment evidence recorded separately, payment proof `PENDING_REAL_PROOF`, Marketplace `NOT_LISTED`, and provider verification not promoted without evidence. Confirm revision configuration has `NODE_ENV=production`, `RADAR_CONTENT_MODE=http`, no `RADAR_EXPORT_LOCAL_TOKEN`, and `PAYMENT_MODE=disabled`; production code rejects fixture mode at startup.

There is no safe payment-free seller endpoint for content retrieval. The authorized Radar response validates real published content and the shared schema, but it does not prove the seller runtime made the request. Do not claim seller-originated retrieval until objective runtime evidence exists.

Only after a separately approved Circle configuration phase may an unpaid `/decision-brief` request be used to verify the official `402` response. Never send a payment authorization during an unpaid check.

## 8. Deployment evidence checklist

| Evidence                                                            | Status before deployment                                                   |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Radar service URL                                                   | Confirmed in manifest; re-capture as `PENDING_REAL_PROOF` for new revision |
| Seller service URL                                                  | `PENDING_REAL_PROOF`                                                       |
| Radar and seller revision IDs                                       | `PENDING_REAL_PROOF`                                                       |
| Immutable image digests                                             | `PENDING_REAL_PROOF`                                                       |
| Deployed commit hash                                                | `PENDING_REAL_PROOF`                                                       |
| Radar runtime identity                                              | Manifest evidence; deployed confirmation `PENDING_REAL_PROOF`              |
| Seller runtime identity                                             | `PENDING_REAL_PROOF`                                                       |
| Sanitized IAM policy excerpt                                        | `PENDING_REAL_PROOF`                                                       |
| Radar health/readiness responses                                    | `PENDING_REAL_PROOF`                                                       |
| Unauthorized export `401`                                           | `PENDING_REAL_PROOF`                                                       |
| Authorized export response with sensitive fields absent             | `PENDING_REAL_PROOF`                                                       |
| Wrong-audience and wrong-caller `401`                               | `PENDING_REAL_PROOF`                                                       |
| Seller health response                                              | `PENDING_REAL_PROOF`                                                       |
| Seller metadata response                                            | `PENDING_REAL_PROOF`                                                       |
| Production fixture-disabled revision configuration/startup evidence | `PENDING_REAL_PROOF`                                                       |
| Seller-originated real content retrieval                            | `PENDING_REAL_PROOF`; not observable through current non-payment API       |
| Logs showing no fixture fallback and no tokens                      | `PENDING_REAL_PROOF`                                                       |
| Deployment timestamps                                               | `PENDING_REAL_PROOF`                                                       |
| Circle payment, settlement, explorer, wallet, Marketplace proof     | Out of scope; `PENDING_REAL_PROOF`                                         |

Capture screenshots or sanitized JSON containing service URLs, revision names, image digests, service-account emails, IAM bindings, timestamps, health/status codes, and response schemas. Never capture bearer tokens, secret values, raw payment payloads, or private source content.

## 9. Risk review

| Risk                                     | Current control                                      | Deployment check                                        | Stop condition                                    | Required before payment activation                |
| ---------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------- |
| Public Radar ingress and protected route | Exact token audience/email verification; fail closed | Anonymous route is `401`; valid identity succeeds       | Anonymous or wrong identity succeeds              | Preserve app verification; edge rate limiting     |
| Public seller ingress                    | Payment verifier gates fulfillment                   | Health/metadata only; inspect unauthenticated behavior  | Fulfillment appears without verified payment      | Rate limiting and Circle verifier proof           |
| Audience mismatch                        | Same configured origin on caller/verifier            | Correct token succeeds; wrong audience is `401`         | Correct token is rejected or wrong token accepted | Freeze canonical audience                         |
| Wrong caller identity                    | Exact verified email allowlist                       | Wrong SA returns `401`                                  | Any other identity succeeds                       | Dedicated SA and periodic IAM review              |
| Secret leakage                           | Tokens not logged; no local token in production      | Inspect env/logs and sanitized manifests                | Token or secret appears in logs/config output     | Secret scan and log-redaction evidence            |
| Fixture mode enabled                     | Production constructor rejects fixture mode          | Revision has `RADAR_CONTENT_MODE=http`; startup healthy | `fixture` appears in production config/logs       | Keep invariant and deployment policy              |
| Payment accidentally enabled             | Default and manifest use `disabled`                  | Inspect exact revision env before traffic               | `PAYMENT_MODE` is not `disabled`                  | Separate approval and controlled proof plan       |
| In-memory idempotency                    | No verified payment in disabled mode                 | Confirm payment disabled                                | Any paid/verified path is reachable               | Durable atomic repository required                |
| Duplicate fulfillment                    | Payment cannot verify while disabled                 | Do not invoke payment path                              | Any fulfillment record is produced                | Durable uniqueness/concurrency proof              |
| Rollback failure                         | Cloud Run revisions and traffic splitting            | Record previous revision before deploy                  | Previous revision/digest unknown                  | Tested traffic rollback procedure                 |
| Cold start                               | Startup boost, minScale 0                            | Measure health latency without changing claims          | Timeouts exceed bounds                            | Decide whether minScale 1 cost is justified       |
| maxScale bottleneck                      | Radar 1, seller 3, bounded requests                  | Observe saturation/error metrics                        | Throttling or timeout under intended demo load    | Owner-approved scaling/load test                  |
| Circle absent                            | Payment disabled                                     | Metadata remains pending/not configured                 | Runtime tries Circle calls                        | Verified official configuration later             |
| Wallet misconfiguration                  | Wallet omitted while disabled                        | Revision contains no wallet binding                     | Wallet appears unexpectedly                       | Validate address/role without exposing secrets    |
| Response/schema drift                    | Strict seller validation and version 1.0.0           | Authorized export validates expected shape              | Seller rejects production response                | Contract test against deployed sanitized response |

## 10. Blocking gaps and owner decisions

There is no code or infrastructure blocker to deploying both services safely with payment disabled. The owner must supply or approve these inputs before executing commands:

1. Approval to reuse Artifact Registry repository `lafryhi-ai-radar` for the seller image, or another confirmed repository.
2. Immutable image tags/digests and confirmation of the exact build-source commit.
3. Re-confirmed Radar service origin and resulting seller origin.
4. Live Radar IAM policy determination: public invoker already present versus conditional seller `roles/run.invoker` binding.
5. An authorized test identity for the negative wrong-caller check, or an approved equivalent test method.
6. Acceptance that seller-originated content retrieval remains `PENDING_REAL_PROOF` during payment-disabled validation because the current public API does not exercise the adapter.

Circle payment configuration, wallet funding, durable payment idempotency, and Marketplace approval are intentionally not blockers for this non-payment deployment verdict. They are mandatory gates before payment activation.

## Safety record

This audit contains command templates only. During the audit no deployment command, IAM mutation, service-account creation, secret creation, payment, wallet action, Marketplace action, staging, commit, or push was executed.
