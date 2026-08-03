# Sprint 6.2 production deployment readiness

Status: prepared, not deployed. Payment activation, wallets, Circle APIs, and Marketplace submission are outside this runbook.

## Fixed topology

| Setting                      | Value                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------- |
| Project                      | `lafryhi-ai-radar-xprize`                                                     |
| Region                       | `us-central1`                                                                 |
| Artifact Registry repository | `lafryhi-ai-radar` (Docker)                                                   |
| Radar service                | `lafryhi-ai-radar`                                                            |
| Radar runtime identity       | `lafryhi-ai-radar-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com`    |
| Seller service               | `lafryhi-x402-seller`                                                         |
| Seller runtime identity      | `lafryhi-x402-seller-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com` |
| Seller payment mode          | `disabled`                                                                    |

The manifests are substitution templates. Never apply a file containing `REPLACE_WITH_`. Export the live Radar configuration before deployment and compare it with the candidate manifest so existing Paddle, Scheduler, Firestore, Vertex, scaling, ingress, service-account, and Secret Manager settings are preserved.

## Automated checks

```powershell
npm.cmd run deployment:validate
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd test

Push-Location services/x402-seller
npm.cmd run format:check
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
Pop-Location
```

Post-deployment smoke tests are GET-only and never call the paid route:

```powershell
npm.cmd run deployment:smoke -- --radar-url https://RADAR_ORIGIN --seller-url https://SELLER_ORIGIN
```

Render deployment copies into a temporary directory only after both image digests exist:

```powershell
npm.cmd run deployment:render -- --output-dir $env:TEMP\lafryhi-deployment --radar-image us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar@sha256:RADAR_DIGEST --seller-image us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-x402-seller@sha256:SELLER_DIGEST --radar-origin https://RADAR_ORIGIN
```

The renderer performs no cloud call and refuses tags, unapproved repositories, non-HTTPS origins, unresolved placeholders, or overwriting an existing output file.

For identity checks, place short-lived tokens in `RADAR_EXPORT_ID_TOKEN`, `RADAR_EXPORT_WRONG_AUDIENCE_TOKEN`, and `RADAR_EXPORT_WRONG_CALLER_TOKEN`. Never pass tokens as CLI arguments or save them to evidence files.

## Pre-deployment checklist

- [ ] Git HEAD and intended commit are recorded; working-tree scope is understood.
- [ ] Root and seller validation commands pass from immutable lockfiles.
- [ ] Clean Radar and seller container builds pass.
- [ ] Image tags contain commit plus UTC timestamp and resolve to immutable digests; neither uses `latest`.
- [ ] Project, region, repository, service names, and both runtime identities are confirmed read-only.
- [ ] Candidate Radar config is diffed against the live revision; no existing secret or billing setting is lost.
- [ ] `REPLACE_WITH_IMMUTABLE_RADAR_IMAGE_DIGEST`, `REPLACE_WITH_IMMUTABLE_IMAGE_DIGEST`, canonical Radar origin, and export URL are resolved in deployment copies outside Git.
- [ ] Radar audience equals the exact canonical Radar origin and allowed caller equals the seller runtime email.
- [ ] `RADAR_EXPORT_LOCAL_AUTH_ENABLED=false`; no local export secret exists in production.
- [ ] Seller has `PAYMENT_MODE=disabled`, `RADAR_CONTENT_MODE=http`, maxScale 1, and no wallet, network, price, facilitator, Circle secret, or local token.
- [ ] Existing Secret Manager references are versions intentionally selected by the owner; secret values are never printed.
- [ ] Radar IAM is read first. If `allUsers` is an invoker, no redundant seller binding is added.
- [ ] Previous ready revision names and image digests are recorded before any traffic change.

## Build and deployment procedure templates

These commands are documentation and were not executed by Sprint 6.2.

```powershell
$PROJECT="lafryhi-ai-radar-xprize"
$REGION="us-central1"
$COMMIT=(git rev-parse --short=12 HEAD)
$STAMP=(Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$RADAR_IMAGE="us-central1-docker.pkg.dev/$PROJECT/lafryhi-ai-radar/lafryhi-ai-radar:$COMMIT-$STAMP"
$SELLER_IMAGE="us-central1-docker.pkg.dev/$PROJECT/lafryhi-ai-radar/lafryhi-x402-seller:$COMMIT-$STAMP"

gcloud builds submit . --project=$PROJECT --region=$REGION --config=cloudbuild.yaml --substitutions="_IMAGE=$RADAR_IMAGE"
gcloud builds submit services/x402-seller --project=$PROJECT --region=$REGION --tag=$SELLER_IMAGE
```

Use digest-qualified image references when generating owner-reviewed deployment copies. Do not run `gcloud run services replace` directly against repository templates. Deploy Radar fail-closed first, validate it, then deploy the payment-disabled seller. Enable the exact Radar audience/caller pair only after both identities and URLs are confirmed.

## Secret and configuration checklist

| Service | Configuration               | Rule                                                            |
| ------- | --------------------------- | --------------------------------------------------------------- |
| Radar   | Existing Operator token     | Preserve current Secret Manager binding; never reuse for seller |
| Radar   | Existing Scheduler secret   | Preserve current Secret Manager binding; never reuse for seller |
| Radar   | Paddle secrets              | Preserve live bindings unchanged; unrelated to x402             |
| Radar   | Export audience/caller      | Non-secret exact values; both required for authorized export    |
| Radar   | Local export secret         | Must be absent in production                                    |
| Seller  | Radar URL/audience          | Non-secret exact values; HTTPS and audience-bound               |
| Seller  | Local export token          | Must be absent in production                                    |
| Seller  | Wallet/Circle/network/price | Must be absent while payment is disabled                        |

## Traffic and rollback procedure

Stop immediately if health/readiness fails, anonymous export succeeds, a wrong token succeeds, fixtures start in production, payment is enabled, or any secret appears in output.

1. Record current revisions and traffic before deployment.
2. Deploy a candidate revision with no traffic when supported, or shift the smallest safe test percentage.
3. Run health, readiness, anonymous export, identity, and metadata checks.
4. Promote only after all checks pass.
5. On failure, restore the recorded revision:

```powershell
gcloud run services update-traffic lafryhi-ai-radar --project=lafryhi-ai-radar-xprize --region=us-central1 --to-revisions=PREVIOUS_RADAR_REVISION=100
gcloud run services update-traffic lafryhi-x402-seller --project=lafryhi-ai-radar-xprize --region=us-central1 --to-revisions=PREVIOUS_SELLER_REVISION=100
```

6. Re-run health and readiness after rollback. Preserve failed revision/log evidence, sanitized.
7. If only export authorization is faulty, return to the previous Radar revision; never enable the local secret as a workaround.

## Post-deployment validation

- [ ] Radar `/api/health` returns 200 with the expected revision.
- [ ] Radar `/api/readiness` returns 200 and expected dependency states.
- [ ] Anonymous export returns 401 before query validation.
- [ ] Correct seller identity and audience returns a strict version 1.0.0 export.
- [ ] Wrong audience and wrong caller each return 401.
- [ ] Export contains only approved/published items, source references, and verification timestamps; no private fields.
- [ ] Seller `/health` returns 200.
- [ ] Seller uses `/health` for startup/liveness; it has no separate readiness endpoint because content access is lazy and payment remains disabled.
- [ ] Seller `/service-metadata` remains `NOT_LISTED` and `PENDING_REAL_PROOF` where proof is unavailable.
- [ ] Seller revision uses `PAYMENT_MODE=disabled` and `RADAR_CONTENT_MODE=http`.
- [ ] No seller-originated content claim is made: no payment-free endpoint currently exercises the adapter.
- [ ] No `/decision-brief` request is sent during this non-payment smoke phase.

## Security validation

- [ ] Runtime identities are separate and neither has Owner, Editor, broad Firestore, broad Secret Manager, or payment roles.
- [ ] Radar public ingress is paired with application-level ID-token audience and email validation on the export route.
- [ ] Seller public ingress exposes only intended endpoints; fulfillment remains payment-gated.
- [ ] Image configuration, environment, logs, and evidence contain no tokens, cookies, credentials, private keys, or secret values.
- [ ] Production rejects fixture mode and has no local authorization fallback.
- [ ] Request limits, timeouts, strict schemas, redirect rejection, and HTTPS requirements remain configured.
- [ ] Dependency and container vulnerability findings are reviewed and recorded without silently updating dependencies.
- [ ] In-memory idempotency is accepted only while payment remains disabled; durable atomic storage is a payment-activation blocker.

## Monitoring checklist

- [ ] Existing Radar readiness uptime check and alert policy are present and enabled.
- [ ] Existing RSS Scheduler non-2xx metric and alert policy are preserved.
- [ ] Seller uptime check for `/health` is owner-approved before creation.
- [ ] Seller 5xx rate, latency, instance count, cold starts, and max-instance saturation are observed.
- [ ] Radar export 401/403/429/5xx rates are monitored without logging bearer tokens.
- [ ] Cloud Run revision, container startup, memory, CPU, and request latency dashboards are captured.
- [ ] Alert notification channel delivery is verified by the owner.
- [ ] Log queries scan for fixture mode, accidental payment mode, credential-shaped fields, and fulfillment errors.

## XPRIZE deployment evidence checklist

Every unavailable item remains `PENDING_REAL_PROOF`.

- [ ] Project and region (`PENDING_REAL_PROOF` for the candidate deployment record)
- [ ] Radar and seller service URLs
- [ ] Revision names and deployment timestamps
- [ ] Immutable image URIs and digests
- [ ] Deployed Git commit hash
- [ ] Runtime service-account emails and sanitized IAM excerpt
- [ ] Secret reference names/versions without values
- [ ] Radar health and readiness responses
- [ ] Anonymous export 401
- [ ] Correct-identity authorized export response
- [ ] Wrong-audience and wrong-caller 401 responses
- [ ] Seller health and truthful metadata responses
- [ ] Revision configuration proving fixture and payment modes
- [ ] Sanitized logs proving no fixture fallback or token leakage
- [ ] Rollback target revisions and, if exercised, rollback result
- [ ] Explicit statement that no payment, wallet, transaction, settlement, explorer, or Marketplace proof exists yet

Do not claim an individual on-chain transaction from a batched Nanopayment, and never record a token or secret merely to strengthen evidence.
