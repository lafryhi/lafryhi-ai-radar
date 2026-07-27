# Sprint 3.1 — Live Source Collection

## Objective

Connect Mission Control's Collect stage to the existing trusted Source Registry and RSS discovery service without starting live Vertex AI analysis.

## Existing services reused

- `SourceDefinition` and `RadarRepository.listSourceDefinitions()` for registry access.
- `TRUSTED_SOURCE_LEVELS` and enabled-status rules from `source-management.ts`.
- `discoverRss()` for bounded, HTTPS-only, allowlisted RSS retrieval, parsing, deduplication, and candidate persistence.
- Existing operator cookie authorization and run-conflict protection.

## Live collection architecture

`mission-control-live.ts` selects enabled trusted sources with configured RSS feeds in deterministic display-name order. It invokes `discoverRss()` per source, reads only candidates from that discovery run, applies the requested period, removes cross-source duplicates, and normalizes candidates into pending, unscored `IntelligenceItem` records with source URL and source-definition traceability.

No Firestore schema is changed. No candidate is sent to `processRssCandidate()` or Vertex AI in this sprint.

## Demo vs Live behavior

- **Prepared Demo** remains the deterministic Sprint 1 workflow and still produces its prepared report/video outputs.
- **Live Collection** uses real registry/RSS services, reports source accounting and partial failures, and stops after Collect. Analyze, Rank, Editorial Review, Report, and Video Package are explicitly deferred.

Live records use neutral zero scores, zero evidence, pending verification/editorial status, and `analysisStatus: deferred`; no “Why ranked?” reasons are fabricated.

## Trusted source eligibility

Only sources with `status: enabled`, trust level `official`, `verified`, or `community`, and a configured RSS feed are attempted. Existing URL allowlists, HTTPS requirements, DNS safety, timeout, feed-size, and bounded-item restrictions remain enforced by RSS discovery.

## Partial failure handling

One source failure produces a warning when other usable records exist. If every eligible source fails, the run returns an error with no records. No stack traces, private URLs, credentials, cookies, or article bodies are sent to the browser.

## Local run

```powershell
$env:AI_RADAR_DEMO_MODE="true"
$env:OPERATOR_ACCESS_TOKEN="a-local-token-with-at-least-20-characters"
npm.cmd run dev
```

Open `/operator/mission-control`, sign in, choose **Prepared Demo** or **Live Collection**, then run the selected mode. Live mode requires `PERSISTENCE_ADAPTER` and a populated trusted Source Registry with eligible RSS feeds.

## Manual verification checklist

1. Run Prepared Demo and confirm the existing deterministic seven-stage flow and outputs remain unchanged.
2. Choose Live Collection and confirm the Live Collection label is visible.
3. Confirm registry totals, eligible/attempted/successful/failed source counts, timings, and safe logs.
4. Confirm collected items are pending, unscored, traceable, and have no ranking reasons.
5. Confirm downstream stages are marked Deferred and no live report/video is created.
6. Disable or block a source and confirm it is excluded from attempted sources.
7. Simulate one feed failure and confirm a warning with usable records.

## Known limitations and Sprint 3.2

Live Vertex AI analysis, ranking, editorial integration for live records, live report generation, and live video packaging are deferred to Sprint 3.2. RSS discovery is currently the live collection method; non-RSS source adapters remain outside this sprint.
