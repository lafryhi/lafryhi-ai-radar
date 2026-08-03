# Future Radar export boundary

No Radar route is added in this sprint. `HttpRadarContentAdapter` is prepared for a future narrowly scoped endpoint that accepts only `{topic, maximumItemCount}` and returns at most five records matching `PublicVerifiedItemSchema`.

The future endpoint must be disabled by default, read-only, protected by Cloud Run IAM using the seller service account and audience-bound identity tokens, bounded, and must select only published items tied to an approved human review. It must not expose pending/rejected records, internal analysis, editorial notes, prompts, operator authentication, diagnostics, or credentials. A Secret Manager token is allowed only as a documented local-development fallback.
