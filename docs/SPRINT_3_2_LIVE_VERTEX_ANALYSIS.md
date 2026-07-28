# Sprint 3.2 — Live Vertex AI Analysis

## Objective

Sprint 3.2 adds bounded, traceable Vertex AI analysis for records collected by the Sprint 3.1 live RSS path. Prepared Demo remains deterministic and unchanged. Live ranking, editorial approval, report generation, and video generation remain deferred.

## Existing services reused

- `src/services/ai.ts` — the existing `GoogleGenAI` Vertex client, model configuration, timeout, and token accounting.
- `src/services/ingestion.ts` — registered-source validation, HTTPS/redirect safety, response limits, and bounded HTML materialization.
- `src/services/mission-control-live.ts` — trusted source selection and traceable live items.

## Architecture and contract

`src/services/live-analysis.ts` materializes each eligible live item through the existing ingestion boundary, caps source content at 20,000 characters, and invokes the existing `VertexAiAnalyzer` through its `analyzeLive` method. Results use the strict `LiveAnalysisOutputSchema` and preserve source identity, pending verification/editorial state, and mandatory human review.

The prompt version is `live-analysis-v1`. Claims may reference only `source-content` or `source-metadata`; unknown evidence references are rejected.

## Prompt-injection defense

Source material is delimited as untrusted data. The prompt instructs the model to ignore embedded instructions, use only supplied material, distinguish facts from interpretation, and avoid fabricated claims. Prompts, article bodies, credentials, cookies, and private URLs are not written to Mission Control logs.

## Cost and reliability controls

- 20,000 source characters per item
- 2,048 output tokens per model call
- two concurrent items by default
- 60-second per-item timeout
- at most two retries, only for transient failures
- deterministic result ordering
- per-item isolation with safe failed/skipped states

## Demo versus Live

Prepared Demo continues to use the existing deterministic seven-stage flow, including report and video output. Live mode collects real sources, analyzes eligible material, and leaves Verify, Rank, Editorial Review, Report, and Video Package deferred. A zero-record run does not instantiate or call Vertex AI.

## Local verification

```powershell
$env:GOOGLE_CLOUD_PROJECT="your-project"
$env:GOOGLE_CLOUD_LOCATION="us-central1"
$env:GEMINI_MODEL="gemini-2.5-flash"
npm.cmd run dev
```

Open `/operator/mission-control` as an authorized operator, select Live Collection, and run a bounded period. A configured source with accessible HTML is required for a real model request. Demo mode can be run without Vertex configuration.

## Manual checklist

- Prepared Demo still completes all seven stages with report/video output.
- Live zero-record run shows Analyze skipped and no model request.
- Live records show analyzed/failed/skipped counts, scores, rationales, evidence references, and Human Review Required.
- Failed model output is represented safely and does not create downstream output.
- Rank, Editorial Review, Report, and Video Package remain deferred.

## Known limitations and Sprint 3.3

Live RSS candidates still require a bounded HTML materialization request before analysis. Analysis is not persisted as a new Firestore record in this sprint. Ranking, live editorial workflows, live reports, live video packages, and publication remain deferred to Sprint 3.3.
