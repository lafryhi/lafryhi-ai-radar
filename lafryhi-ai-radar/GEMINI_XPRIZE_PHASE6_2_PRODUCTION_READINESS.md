# Phase 6.2 — Production Readiness Fixes

**Completed:** July 24, 2026  
**Project:** `lafryhi-ai-radar-xprize`  
**Cloud Run service:** `lafryhi-ai-radar`  
**Region:** `us-central1`  
**Revision:** `lafryhi-ai-radar-00010-zmj`

## Scope

Phase 6.2 corrected only the two issues exposed by the first RSS-candidate
production dry run:

1. missing structured lifecycle events; and
2. a misleading `candidate=failed` redirect after successful persistence.

No architecture, persistence schema, business rule, scheduler, IAM binding,
secret, source, discovery behavior, approval rule, or publication rule was
changed.

## Root causes

The pipeline previously centralized only its final `pipeline.completed` event.
The successful persistence boundaries for the analysis and pending review did
not call a structured logger, and processing-run creation did not emit a
started event.

The candidate server action called Next.js `redirect()` inside its success
`try` block. Next implements redirects by throwing a framework control-flow
exception. The broad `catch` intercepted that exception and issued the failure
redirect even though the candidate, source record, processing run, analysis,
and pending review had already been saved.

## Implementation

`pipeline-events.ts` now defines strict Zod schemas and emitters for:

- `pipeline.started`
  - `processingRunId`
  - optional `candidateId`
  - `sourceId`
  - `timestamp`
- `analysis.created`
  - `analysisId`
  - `processingRunId`
  - optional `candidateId`
  - `model`
  - `timestamp`
- `review.pending_created`
  - `reviewId`
  - `analysisId`
  - `status: pending`
  - `timestamp`

The candidate identifier is passed as safe context from the RSS candidate
processing service. Manual URL intake and reruns remain compatible because the
field is optional. The events never accept source bodies, prompts, model
responses, cookies, authorization headers, credentials, tokens, or secrets.

The candidate action now catches only failures from processing. Revalidation
and the success redirect occur after the `try/catch`, so the framework redirect
cannot be mistaken for an application failure. Persistence and business logic
are unchanged.

## Local validation

All commands passed:

- `npm.cmd test`: 12 files, 55 tests
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`: Next.js 16.2.11 production build

Tests assert the ordered event sequence for initial processing and reruns:

`pipeline.started` → `analysis.created` → `review.pending_created` →
`pipeline.completed`

They also verify candidate provenance and the exclusion of secret-bearing
fields.

## Deployment

- Cloud Build: `b801a661-2fe8-4340-975d-e2ab262652ab`
- Build status: `SUCCESS`
- Build start: `2026-07-24T19:23:37.276518209Z`
- Build finish: `2026-07-24T19:25:12.187393Z`
- Image: `us-central1-docker.pkg.dev/lafryhi-ai-radar-xprize/lafryhi-ai-radar/lafryhi-ai-radar:phase6-2`
- Digest: `sha256:9f8b7f6435a1d0166a94adc95a322a7db0bd473c72eb73f483bc54df611dcf8e`
- Revision: `lafryhi-ai-radar-00010-zmj`
- Traffic: 100%

The service remains private. Its scheduler service account remains the only
service-level `roles/run.invoker` member. The runtime service account, Secret
Manager binding, environment configuration, Firestore database, scheduler,
request-only CPU, minimum instance count of zero, and service maximum instance
limit of one were preserved.

## Production dry run

Exactly one existing pending candidate was processed:

- Candidate: `6293f9fc76ed0eba2de81dc29da122325d68c3fc4bdec4e0f8af196b4ded8280`
- Title: **Ask an AI expert: What exactly is the full stack?**
- Source record: `f135d514-d4b4-4478-bc11-75b06d22ae8a`
- Processing run: `2b92c2e5-897f-45ff-b347-5c97301064a4`
- Analysis: `04069b10-6c54-410e-b1e7-f45887def0ef`
- Pending review: `dff113cd-7f61-4ca7-ae3a-93af1be0d9ad`
- Gemini model: `gemini-2.5-flash`
- Schema validation: passed
- Pipeline latency: 12,256 ms

The server action returned HTTP 303 with
`?candidate=processed`, confirming the redirect correction.

The protected review queue and detail page both returned HTTP 200. The detail
page contained the source, run, and analysis provenance IDs, the AI-generated
analysis section, the human-decision section, and pending status. No approval
or rejection was performed.

## Structured log evidence

Cloud Logging recorded exactly one of each expected event for the dry run:

1. `pipeline.started`
2. `analysis.created`
3. `review.pending_created`
4. `pipeline.completed`
5. `operator.review_opened`

The identifiers in those events match the Firestore records above. The
validation window contained zero `ERROR`-or-higher entries and no indicators
of credentials, tokens, authorization headers, prompts, article bodies, raw
Gemini responses, or secret values.

## Firestore evidence

| Collection | Before | After | Change |
|---|---:|---:|---:|
| `rssCandidates` | 10 | 10 | 0 |
| `analysisResults` | 2 | 3 | +1 |
| `reviewDecisions` | 2 | 3 | +1 |
| `processingRuns` | 4 | 5 | +1 |
| `radarItems` | 1 | 1 | 0 |
| `rssDiscoveryRuns` | 1 | 1 | 0 |

Candidate states changed from nine pending and one processed to eight pending
and two processed. Exactly one candidate changed state. No discovery,
approval, rejection, or publication occurred.

## Remaining limitations

- Operator access still uses the temporary environment-configured token rather
  than a multi-user identity system.
- Cloud Run remains private, so operator browser access requires an
  authenticated invocation path.
- Pending review content still requires deliberate human approval or rejection.

Phase 7 was not started.
