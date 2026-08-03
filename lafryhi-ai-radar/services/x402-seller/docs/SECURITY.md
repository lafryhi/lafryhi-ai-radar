# Security boundary

- Use a dedicated seller Cloud Run service account. Do not reuse the Radar runtime identity.
- Use Cloud Run IAM and audience-bound identity tokens for seller-to-Radar export. A local static token is a development fallback only and belongs in Secret Manager, never source.
- Wallet/signing material is never accepted from request bodies, logged, stored in image layers, or used by tests.
- The JSON body limit defaults to 16 KiB; fields, formats, languages, and item counts are bounded and unknown properties are rejected.
- The content client times out, rejects nonconforming payloads, and fails closed.
- Logs are structured and must contain event/category/reference values only—not raw payment signatures, authorization payloads, tokens, or content-export credentials.
- Production requires rate limiting/abuse controls at the edge and a durable transactional idempotency repository.

The fixture adapter is deterministic labeled demo data and must never be represented as live intelligence. `PAYMENT_MODE=disabled` is the safe default.
