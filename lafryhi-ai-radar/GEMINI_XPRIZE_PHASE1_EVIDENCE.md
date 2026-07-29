# Phase 1 Evidence Guide

## Real pipeline

The code implements URL allowlisting, bounded server fetch, source normalization/hash, duplicate detection, Vertex AI Gemini analysis, strict output validation, durable run state, human review, and approval-gated publication. IDs for the source, processing run, analysis, review decision, and public item remain linked.

No source record, user, revenue, or successful cloud run is fabricated or seeded.

## Google Cloud services represented

- **Vertex AI:** implemented through `@google/genai` in Vertex AI mode; requires real project credentials and enablement.
- **Firestore:** production repository adapter implemented; requires a real database and IAM.
- **Cloud Run:** standalone production container implemented; deployment has not been performed by Phase 1 code alone.

Only services proven by actual configured runs/deployments should be claimed in submission material.

## Manual screenshots to capture after real configuration

1. Operator source submission before processing, showing the canonical URL.
2. Processing run showing model, prompt version, validation outcome, latency, and token usage.
3. Review screen showing structured analysis, exact evidence excerpts, warnings, and source link.
4. Approved public item showing scores, original-source link, human-review label, and traceability IDs.
5. A rejected or failed run proving invalid content does not publish.
6. Vertex AI API usage/Cloud Logging for the same run ID.
7. Firestore documents with sensitive values redacted.
8. Cloud Run revision and service URL only after deployment.

## Useful logs and metrics

Structured events currently include `pipeline.completed`, `pipeline.failed`, and `review.approved`. Preserve run ID, source record ID, model, prompt version, latency, validation outcome, retry count, token usage, and bounded failure details. Add dashboards only after real Cloud Run traffic exists.

## What is genuinely AI-operated

Gemini produces the structured summary, business significance, category, relevance/confidence scores, recommended action, evidence selection, warnings, and opportunity extraction from supplied source content. Application code controls source admission, state transitions, validation, duplicate detection, and publication. A human controls approval.

## What remains manual

- Selecting/submitting a source URL.
- Reviewing source and analysis.
- Approving, rejecting, or requesting changes.
- Configuring Google Cloud, credentials, Firestore, and Cloud Run.
- Capturing screenshots and reconciling runtime evidence.

## Limitations

This phase proves one controlled vertical slice, not autonomous broad monitoring. It does not prove real usage, revenue, scheduled ingestion, Firebase Authentication, personalization, or deployment. Test mocks demonstrate deterministic behavior only and must never be presented as real Gemini output.

