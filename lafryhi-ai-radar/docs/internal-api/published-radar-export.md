# Published Radar export 1.0.0

`GET /api/internal/agent-services/published-radar-export` is a read-only service boundary for the isolated x402 seller. It is implemented but not deployed.

The route accepts only `topic`, `maximumItemCount` (1–5), optional `language`, and optional `freshnessHours` (1–8760). Unknown or malformed parameters fail with `400`. The handler reads at most 25 published candidates, returns at most five records, has an eight-second application timeout, and emits a bounded minimal schema. Configure infrastructure rate limiting in front of the route; no caller-provided Firestore query is accepted.

## Authorization

Production requires a Google-signed, audience-bound ID token whose verified email exactly equals `RADAR_EXPORT_SELLER_SERVICE_ACCOUNT`. Set `RADAR_EXPORT_AUDIENCE` to the Radar service audience. Grant invocation only to a new dedicated seller service account; do not reuse the Radar runtime, Operator token, browser cookie, or Scheduler secret. Cloud Run IAM should be the first authorization layer, while application verification provides the route-specific identity boundary.

Local secret authorization is disabled by default. It requires `RADAR_EXPORT_LOCAL_AUTH_ENABLED=true`, a distinct `RADAR_EXPORT_LOCAL_SECRET` of at least 20 characters, and a non-production runtime. It never falls back to Operator or Scheduler credentials.

## Publication guarantee and known gap

Every returned item must link a stored `RadarItem` (`publicationState=published`) to the exact `ReviewDecision` (`status=approved`, non-null `reviewedAt`) and its stored source record. RadarItems are created by the existing approval service only after human review. Source references and verification timestamps therefore come from persisted provenance, not inferred text. A missing link fails closed.

`publiclyEligible=true` is derived from that existing published-plus-approved invariant; there is no separate revocation/eligibility field in the current persistence model. `humanReviewRequired=true` reflects the existing publication workflow. `publicUrl` remains `null` because Radar does not persist a canonical public item URL. Language is returned only when the source has a linked source definition; otherwise it is `null` and language-filtered requests exclude it.

The contract is mirrored at `services/x402-seller/contracts/published-radar-export.schema.json`. No editorial notes, source body, prompts, diagnostics, or credentials are returned.

## Pending operations

The route has not been deployed. The dedicated seller identity, IAM invoker binding, production audience values, infrastructure rate limit, and controlled integration proof are pending. No payment or wallet action is part of this route.
