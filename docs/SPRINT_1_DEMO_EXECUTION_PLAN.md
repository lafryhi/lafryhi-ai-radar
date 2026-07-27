# Sprint 1: AI Radar Mission Control

## Objective

Provide an authenticated, demo-first weekly intelligence workflow that makes collection, verification, analysis, ranking, editorial review, reporting, and video packaging visible in one operator screen.

## Implemented scope

Mission Control adds a typed application-boundary adapter, deterministic prepared sample data, an in-process seven-stage runner, safe execution logs, approved-item-only report and video outputs, a protected API route, and the `/operator/mission-control` page. It does not collect a qualification corpus or change production ingestion, review, or publishing behavior.

## Architecture decisions

- `src/domain/mission-control.ts` owns presentation contracts and score/ranking validation.
- `src/services/mission-control-demo.ts` owns prepared sample records; none are embedded in UI components.
- `src/services/mission-control-pipeline.ts` coordinates the bounded in-process demo execution and enforces editorial filtering.
- Existing operator cookie authorization and operator navigation are reused.

## Demo and live behavior

Set `AI_RADAR_DEMO_MODE=true` to enable the prepared, deterministic run. The UI displays a Demo Mode badge and every record is labeled as a prepared sample. Live mode is intentionally unavailable in this sprint and returns a warning rather than pretending prepared data is live.

## Security considerations

The API requires the existing HTTP-only operator cookie, accepts no privileged credentials from the browser, validates the request with Zod, returns bounded errors, and emits only static, non-sensitive execution messages. Existing human editorial status remains the publication boundary.

## Local run and verification

```powershell
$env:AI_RADAR_DEMO_MODE="true"
$env:OPERATOR_ACCESS_TOKEN="a-local-token-with-at-least-20-characters"
npm.cmd run dev
```

Open `http://localhost:3000/operator/mission-control`, sign in through `/operator/login`, and select **Generate Weekly Intelligence**.

Validation commands: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test`, and `npm.cmd run build`.

## Manual verification checklist

1. Sign in as an operator and confirm the Mission Control navigation link is present.
2. Confirm the local and Demo Mode badges are visible.
3. Run the workflow without a page reload.
4. Confirm all seven stage cards, timings, counts, and safe log messages appear.
5. Confirm pending and rejected items remain visible but are absent from the report and video package counts.
6. Expand **Why ranked?** for each item.
7. Set `AI_RADAR_DEMO_MODE=false` and confirm the workflow is disabled.

## Known limitations and deferred features

Live source collection, Vertex AI execution, streaming progress, persistence of demo runs, relationship maps, and intelligence timelines remain outside this sprint. The prepared data is not a production corpus.
