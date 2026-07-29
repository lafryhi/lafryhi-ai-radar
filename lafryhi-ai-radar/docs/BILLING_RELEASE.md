# Sprint 7 Billing Release

LAFRYHI AI Radar uses Paddle Billing as its only payment provider. Paddle Checkout collects payment details; the application never collects or stores card data. Verified Paddle webhooks, rather than browser redirects, control subscription state and paid entitlements.

## Commercial model

| Plan | Monthly price | Business Profiles | Decision Briefs per UTC calendar month |
| --- | ---: | ---: | ---: |
| Free | $0 | 1 | 3 |
| Pro | $9 recurring | 3 | 50 |

Feedback, action tracking, outcomes, public Trusted Signals, and My Impact remain available on both plans. Pro also provides priority access to newly published signals and Paddle-hosted subscription management. Limits are defined centrally in `src/services/billing.ts`.

Past-due, paused, canceled, expired, missing, or inconsistent billing state resolves to Free. Active or trialing Pro access is granted only by locally stored state produced from a verified Paddle webhook. Existing owner data remains readable after a downgrade.

Usage is keyed by the UTC `YYYY-MM` calendar month. A unit is recorded only after a Decision Brief is persisted successfully. `INSUFFICIENT_EVIDENCE` is a completed analysis and consumes one unit. Failed generation does not consume usage. A repeated request with the same generation idempotency key returns its existing brief and does not consume another unit.

## Persistence

The additive Firestore collections are:

- `billingCustomers`: owner mapping, validated email, optional display name, Paddle customer reference, checkout correlation, timestamps, schema version.
- `subscriptions`: owner and internal customer references, Paddle subscription/transaction references, controlled plan/status, billing period, cancellation state, provider event time, timestamps, schema version.
- `entitlements`: effective plan and limits, verified source, effective/expiry times, safe diagnostic state, schema version.
- `usageCounters`: owner, UTC period key, successful Decision Brief count, timestamps, schema version.
- `billingWebhookEvents`: Paddle event id/type, safe processing status, resolved owner when available, event/receipt/processing times, failure category, schema version. Full webhook payloads are not retained.
- `commercialEvents`: safe funnel event, optional owner and plan, timestamp, schema version.

No existing Decision Brief, Business Context, signal, evidence, feedback, action, outcome, or analytics document shape is changed.

## Required configuration

Set `BILLING_ENABLED=true` only after every Paddle value is configured:

- `PADDLE_ENVIRONMENT=sandbox` for validation, or `production` after explicit activation.
- `PADDLE_CLIENT_TOKEN` — browser-safe token for the selected Paddle environment.
- `PADDLE_API_KEY` — server-only Paddle API key.
- `PADDLE_WEBHOOK_SECRET` — server-only notification destination secret.
- `PADDLE_PRO_PRICE_ID` — the environment-specific recurring $9 Pro price id.
- `PADDLE_DEFAULT_CHECKOUT_URL` — the deployed application origin.

Production runtime validation fails when billing is enabled but the configuration is incomplete. The health endpoint does not depend on Paddle. Readiness reports only `configured`, `not_configured`, or `degraded` and never reveals identifiers or secrets.

Configure a Paddle notification destination for:

`https://<cloud-run-service>/api/billing/paddle/webhook`

Subscribe at minimum to relevant `subscription.*`, `transaction.completed`, and transaction payment-failure events. Use Paddle sandbox credentials and a sandbox price for validation. Never place API keys or webhook secrets in source control or browser-visible environment variables.

## Sandbox acceptance checklist

1. Open `/pricing` and select Upgrade to Pro.
2. Enter a valid billing email and open Paddle sandbox Checkout.
3. Complete Checkout using Paddle sandbox test data; confirm no real charge occurs.
4. Confirm the success page says webhook verification may take time and does not itself grant Pro.
5. Confirm the webhook endpoint accepts the signed event and records its Paddle event id once.
6. Confirm `/billing` resolves Pro, shows the 3/50 limits, and offers Paddle-hosted subscription management.
7. Confirm existing profiles, briefs, feedback, actions, outcomes, and impact data remain available.
8. Confirm a second anonymous browser session cannot read billing state.
9. Confirm operator revenue aggregates show the verified subscription without exposing emails, owner ids, provider ids, or raw payloads.
10. Cancel in Paddle sandbox and confirm a verified cancellation changes the future entitlement according to the fail-closed rule.

Record only non-secret transaction and event identifiers in the release report.

## Deployment

Build and deploy from the `lafryhi-ai-radar` directory only:

```powershell
gcloud builds submit --project=lafryhi-ai-radar-xprize --tag=us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:sprint7-paid-plans .
gcloud run deploy lafryhi-ai-radar --project=lafryhi-ai-radar-xprize --region=us-central1 --image=us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:sprint7-paid-plans
```

Attach server secrets through Cloud Run/Secret Manager, not source files. Confirm the actual Artifact Registry repository and the service’s existing non-billing environment before running these commands.

## Legal and operating limitations

The public Terms, Privacy, and Refund Policy are an operational MVP baseline. Before accepting real payments, the product owner must obtain appropriate legal review, fill any legally required business identity/contact disclosures, verify the chosen refund process against the active Paddle account terms, and publish a support contact.

Billing identity is attached to an anonymous HTTP-only browser session. Clearing cookies or moving browsers can lose workspace access until full authentication and account recovery are implemented. No insecure cookie-to-cookie transfer is supported.

Paddle production activation, a real verified payment, tax/account onboarding, and the final legal review are manual gates. A deployed build with `BILLING_ENABLED=false` must not be represented as accepting payments.
