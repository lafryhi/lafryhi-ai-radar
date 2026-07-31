# Minimal production monitoring

This directory records the approved H-01 monitoring resources for
`lafryhi-ai-radar-xprize`. These files contain no credentials or secret values.

Resources:

- `rss_scheduler_non_2xx.metric.json` — log-based counter for any non-2xx
  response emitted by the RSS Cloud Scheduler job.
- `rss_scheduler_non_2xx.alert-policy.json` — enabled alert after more than two
  recorded failures in 24 hours (at least three events), using one retry-safe
  notification channel.
- `readiness.uptime-check.json` — HTTPS GET check for `/api/readiness` every
  five minutes from the USA probe region.
- `readiness.alert-policy.json` — enabled alert when the readiness check remains
  below 100% for ten minutes.

The email notification channel was created separately and its verification
message was requested. Monitoring email delivery remains pending until the
operator confirms the link sent to the configured operations address.

Rollback is intentionally explicit and must target only the resource IDs
recorded in these files. Do not alter Cloud Run, Scheduler, IAM, secrets, or
application configuration as part of H-01.
