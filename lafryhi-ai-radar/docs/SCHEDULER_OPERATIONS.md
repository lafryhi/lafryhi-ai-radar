# Cloud Scheduler Operations

This runbook documents the production RSS discovery Scheduler integration.

## Contract

The job `lafryhi-ai-radar-rss-discovery` sends a `POST` request to:

```text
/api/internal/rss/scheduled
```

The request is protected by the existing Cloud Run OIDC configuration and the application authentication gate. The application requires:

- the Cloud Scheduler marker header to be exactly `true`;
- a job-name header that is either the configured plain job name or the canonical Scheduler resource ending in `/jobs/<configured-job-name>`; and
- the Scheduler secret to match the Secret Manager value using constant-time comparison.

The job-name comparison trims surrounding whitespace and trailing slashes. No credentials or header values belong in logs or documentation.

## Verification checklist

Use read-only checks before investigating an incident:

1. Confirm the job is enabled and its target URI is the production `run.app` URL.
2. Confirm the OIDC service account is the dedicated Scheduler identity.
3. Confirm the OIDC audience is the Cloud Run service origin, without the route path.
4. Confirm the service account has `roles/run.invoker` on the Cloud Run service.
5. Confirm the latest revision is Ready and the readiness endpoint is healthy.
6. Review Scheduler execution status and the matching Cloud Run request logs.

Example read-only commands:

```powershell
gcloud.cmd scheduler jobs describe lafryhi-ai-radar-rss-discovery `
  --project=lafryhi-ai-radar-xprize --location=us-central1 --format=json

gcloud.cmd run services get-iam-policy lafryhi-ai-radar `
  --project=lafryhi-ai-radar-xprize --region=us-central1 --format=json

curl.exe -sS https://lafryhi-ai-radar-1090908272413.us-central1.run.app/api/readiness
```

Never print or retrieve secret payloads during routine diagnosis. If authentication fails, use sanitized boolean diagnostics or status metadata only.

## Incident handling

An HTTP 401 from the scheduled route should be classified in this order:

1. Cloud Run IAM or OIDC delivery;
2. Scheduler marker and job-name validation;
3. Secret validation;
4. downstream RSS discovery.

Do not change authentication predicates, rotate secrets, or trigger a job until the failing layer is evidenced and approved. A successful HTTP 200 with an `rss.discovery_completed` event confirms that authentication passed; the discovery status may still be `partial` when individual sources fail validation or retrieval.

## Change controls

Scheduler or Cloud Run changes require:

- a focused code or configuration review;
- the full test suite, typecheck, and lint for code changes;
- an immutable image;
- an image-only Cloud Run update;
- zero configuration drift verification;
- one controlled Scheduler verification;
- confirmation that no secret values were exposed.

