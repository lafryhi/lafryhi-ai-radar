# Paddle Sandbox Activation

Status on 2026-07-29: **blocked at Paddle account authentication**. The application and Cloud Run integration are ready, but no Paddle sandbox account resources or credentials have been configured. Billing remains safely disabled.

## Verified deployment state

- Project: `lafryhi-ai-radar-xprize`
- Region: `us-central1`
- Service: `lafryhi-ai-radar`
- Public origin: `https://lafryhi-ai-radar-1090908272413.us-central1.run.app`
- Webhook destination: `https://lafryhi-ai-radar-1090908272413.us-central1.run.app/api/billing/paddle/webhook`
- Current billing state: `BILLING_ENABLED=false`
- Current readiness billing state: `not_configured`
- Existing Secret Manager entries: operator and RSS scheduler secrets only

No Paddle product, price, token, API key, notification destination, webhook secret, checkout, transaction, subscription, or verified entitlement was created during this blocked activation attempt.

## Owner authentication gate

The product owner must sign in to, or create and verify, a Paddle **Sandbox** account in the open Paddle login page. Do not use live-account credentials or configure live mode.

After authentication, resume with this sequence:

1. Confirm the dashboard is visibly in Sandbox/Test mode.
2. Reuse an existing product only if it exactly matches `LAFRYHI AI Radar Pro`.
3. Reuse an existing price only if it is active, recurring, USD 9.00 monthly, has no trial, setup fee, coupon, annual interval, or usage billing.
4. Otherwise create one product and one matching monthly price. Record the returned `pri_...` identifier without committing it.
5. Under Developer tools > Authentication, create or reuse a sandbox client-side token. Sandbox client tokens start with `test_`.
6. Create a minimum-permission sandbox API key for customer portal session access and required billing inspection. Sandbox API keys contain `_sdbx_`.
7. Configure the deployed origin/default payment link as required by Paddle Checkout.
8. Create one notification destination at the webhook URL above.
9. Subscribe only to:
   - `subscription.created`
   - `subscription.activated`
   - `subscription.updated`
   - `subscription.past_due`
   - `subscription.paused`
   - `subscription.canceled`
   - `subscription.resumed`
   - `transaction.completed`
   - `transaction.payment_failed`
   - `transaction.past_due`
10. Capture the notification destination secret once and store it immediately in Secret Manager.

## Secret Manager plan

Create these secrets without printing their values:

- `lafryhi-ai-radar-paddle-client-token`
- `lafryhi-ai-radar-paddle-api-key`
- `lafryhi-ai-radar-paddle-webhook-secret`

Grant the existing runtime service account access only to these secrets:

`lafryhi-ai-radar-runtime@lafryhi-ai-radar-xprize.iam.gserviceaccount.com`

Use non-secret Cloud Run values for:

- `BILLING_ENABLED=true`
- `PADDLE_ENVIRONMENT=sandbox`
- `PADDLE_PRO_PRICE_ID=<sandbox recurring price id>`
- `PADDLE_DEFAULT_CHECKOUT_URL=https://lafryhi-ai-radar-1090908272413.us-central1.run.app`

Bind the secret references to:

- `PADDLE_CLIENT_TOKEN`
- `PADDLE_API_KEY`
- `PADDLE_WEBHOOK_SECRET`

Preserve every existing Cloud Run environment value and secret reference. Do not replace the full environment accidentally.

## Activation verification

Do not open Checkout unless `/api/readiness` returns HTTP 200 with billing `configured`.

Use a fresh anonymous browser session:

1. Visit `/pricing`, enter a test email, and open the Pro overlay.
2. Confirm the checkout has Paddle Test Mode branding and USD 9 monthly recurring terms.
3. Complete it with Paddle's sandbox payment method. No real payment is involved.
4. Confirm `/billing/success` alone still resolves Free.
5. Wait for verified webhook processing, then confirm `/billing` reports Pro, an active subscription, and limits `3` profiles and `50` Decision Briefs for the UTC month.
6. Verify existing owner data and accumulated Free usage remain present.
7. Create a second Business Profile to prove the former Free limit is lifted. Do not generate 50 Gemini analyses.
8. Open Paddle-hosted subscription management from `/billing`.
9. Verify operator revenue aggregates while explicitly treating all entries as sandbox data.
10. After recording activation evidence, schedule or perform cancellation through Paddle, preserve the Paddle-reported effective date, and verify the resulting webhook and fail-closed entitlement behavior.

Record privately:

- Cloud Build ID and Cloud Run revision
- Non-secret sandbox transaction and subscription identifiers
- Checkout, webhook receipt, and entitlement activation timestamps
- Exact webhook event types received
- Pre-cancellation and post-cancellation internal states

Never store credentials, full webhook payloads, customer information, anonymous owner IDs, or browser profile data in this repository.

## Switching to Paddle Live later

Live activation is a separate future release. Never reuse sandbox tokens, API keys, webhook secrets, product IDs, price IDs, customers, or subscriptions. Create independent live resources only after explicit approval, Paddle live-account verification, legal review, and a production-payment launch decision. Change `PADDLE_ENVIRONMENT` only as part of that controlled release.
