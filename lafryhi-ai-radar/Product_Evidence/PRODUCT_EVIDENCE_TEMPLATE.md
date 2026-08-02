# Product Evidence Register

**Project:** LAFRYHI AI Radar  
**Evidence capture date:** 2026-08-02  
**Production revision:** `lafryhi-ai-radar-00059-r8n`  
**Cloud project:** `lafryhi-ai-radar-xprize`

## Google Cloud Billing

- Artifact: `assets/google-cloud-billing-reports.png`
- Authenticated view: Google Cloud Billing Reports
- Project filter: `lafryhi-ai-radar-xprize`
- Current period shown: 1-31 August 2026
- Current-period spend shown: US$0.00
- Remaining free-trial credits shown: US$299.25 of US$300.00
- Captured: 2026-08-02T02:21:51Z

## Cloud Run

- Service: `lafryhi-ai-radar`
- Region: `us-central1`
- Revision: `lafryhi-ai-radar-00059-r8n`
- Traffic: 100%
- Ready: true
- URL: <https://lafryhi-ai-radar-1090908272413.us-central1.run.app>
- Health and readiness: HTTP 200 on 2026-08-02

## Gemini Usage

- Provider: Vertex AI
- Model: `gemini-2.5-flash`
- Evidence: authenticated Operator Dashboard and Human Verification queue
- Dashboard values: 6 completed runs, 3 awaiting verification, 3 verified analyses, 3 published Decision Briefs
- Artifact: `assets/operator-dashboard.png`

## Observability and Logs

- Cloud Logging resource: Cloud Run revision `lafryhi-ai-radar-00059-r8n`
- Verified requests: `/operator`, `/operator/sources`, `/api/health`, `/api/readiness`
- Result: HTTP 200 after deployment
- Observed latency examples: `/operator` 0.008s-0.023s; `/operator/sources` 0.125s
- Readiness checks: configuration `ok`, Firestore `ok`, Vertex AI `configured`, billing `configured`

## Application Screenshots

- Homepage: `assets/live-homepage.png`
- Decision Center: `assets/decision-center.png`
- Decision Brief: `assets/decision-brief.png`
- Operator Dashboard / Mission Control: `assets/operator-dashboard.png`
- Source Registry: `assets/source-registry.png`

## GitHub

- Artifact: `assets/github-repository.png`
- Repository: <https://github.com/lafryhi/lafryhi-ai-radar>
- Visibility: Public
- Captured commit shown: `3e46d5f` (`ops(monitoring): add minimal production alerts`)
- License: MIT (`LICENSE`)

## Video Demo

- Artifact: `assets/youtube-demo.png`
- Public URL: <https://www.youtube.com/watch?v=BDI_BVvO6tA>
- Verified duration: 1 minute 46 seconds

## Evidence integrity

All values above were read from the deployed application, authenticated Google Cloud surfaces, Cloud Run/Cloud Logging responses, the repository, or the public video. No secret values or invented financial figures are included.
