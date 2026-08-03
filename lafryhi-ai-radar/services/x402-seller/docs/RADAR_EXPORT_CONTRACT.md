# Published Radar export boundary

The production contract is version `1.0.0` at `contracts/published-radar-export.schema.json`. The seller calls `GET /api/internal/agent-services/published-radar-export` with only `topic`, `maximumItemCount`, and `language`. It validates the complete response strictly, caps it at 64 KB, follows no redirects, uses an eight-second timeout, and retries once only for transport failures or `502`/`503`/`504` read failures.

Production obtains an audience-bound Google ID token from the Cloud Run metadata server. `RADAR_EXPORT_URL` must be HTTPS, and the Radar service verifies both audience and the dedicated seller service-account email. Tokens are never logged. A static token provider exists only for explicitly configured non-production development.

Fixture content is restricted to tests and non-production deterministic demos. `RADAR_CONTENT_MODE` defaults to disabled, production rejects fixture mode, and an unavailable or invalid export fails closed. It never silently manufactures a brief or falls back to fixtures.

The Radar route and identity are implemented but not deployed or configured. Dedicated IAM roles, production audience values, rate limiting, and a controlled proof run remain pending. No real payment occurred.
