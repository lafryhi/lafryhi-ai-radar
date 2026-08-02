# LAFRYHI AI Radar - Product Evidence

**Prepared for:** Build with Gemini XPRIZE (Devpost)  
**Category:** Small Business Services  
**Evidence status date:** 2026-08-02  
**Production revision:** `lafryhi-ai-radar-00059-r8n`

## Project links

| Item | URL | Status |
|---|---|---|
| Project name | LAFRYHI AI Radar | VERIFIED |
| Live demo | <https://lafryhi-ai-radar-1090908272413.us-central1.run.app> | VERIFIED in deployment configuration; final availability check required |
| GitHub repository | <https://github.com/lafryhi/lafryhi-ai-radar> | VERIFIED from Git remote; confirm judge access and license |
| YouTube demo | <https://www.youtube.com/watch?v=BDI_BVvO6tA> | VERIFIED public video, 1:46 |

## Project summary

LAFRYHI AI Radar is a Gemini-powered decision-intelligence platform for small businesses. It monitors governed sources, retrieves trusted signals, uses Gemini to produce structured business analysis, validates that analysis against application schemas, and holds every candidate brief for human verification. A Decision Brief becomes available only after approval; the system does not auto-publish model output.

The submission should explicitly explain how this AI workflow transforms the business operation and why the product belongs in the Small Business Services category.

## Google Cloud architecture

```text
Governed HTTPS sources / scheduled discovery
                  |
                  v
       Next.js service on Cloud Run
          |                    |
          v                    v
 Vertex AI Gemini API       Firestore
 structured analysis      governed records
          |                    |
          +---------+----------+
                    v
        Schema and policy validation
                    |
                    v
          Human Verification queue
                    |
             approve / reject
                    |
                    v
        Decision Center / Decision Brief

Operational layer: Cloud Logging, Cloud Monitoring, health/readiness checks,
Secret Manager references, and least-privilege Cloud Run service identity.
```

Repository evidence: `Dockerfile`, `cloudbuild.yaml`, `cloudrun.service.yaml`, `ops/monitoring/`, and the health endpoint implementation. The production manifest identifies project `lafryhi-ai-radar-xprize`, region `us-central1`, service `lafryhi-ai-radar`, Firestore persistence, and Vertex AI.

## Gemini API workflow

1. A governed source is registered and fetched through controlled retrieval.
2. The system preserves provenance, checks publication metadata, applies content limits, and detects duplicates.
3. The server invokes Gemini through Vertex AI using the production model configured as `gemini-2.5-flash`.
4. Gemini returns structured decision intelligence: business significance, opportunity, risk, confidence, and recommended actions.
5. The response is parsed and validated against strict schemas. Invalid or failed output does not create a Decision Brief.
6. Deterministic editorial policy produces an explainable effective position without overwriting raw model output.
7. The result enters Human Verification. No model output is automatically published.

For Devpost, capture a privacy-safe Vertex AI usage view and correlated execution logs showing at least one Gemini call made by the deployed application. Do not expose prompts containing private data, credentials, project numbers, or tokens.

## Deployment workflow

```text
Source repository -> Cloud Build -> container image in Artifact Registry
-> Cloud Run revision -> health/readiness validation -> 100% service traffic
```

`cloudbuild.yaml` builds and publishes a versioned container image. `cloudrun.service.yaml` declares the production runtime, port 8080, runtime service account, Cloud Run limits, Firestore and Vertex configuration, and Secret Manager-backed secrets. The deployment should be evidenced with a Cloud Run service overview, active revision, traffic allocation, public URL, successful health/readiness response, and a matching build or image identifier.

## Human Verification workflow

1. Gemini analysis is stored as a candidate result, never as an automatically published brief.
2. Strict validation and policy checks surface evidence, confidence, conflicts, and review requirements.
3. An authenticated operator opens the review queue in the Operator Dashboard.
4. The operator examines source provenance and the generated recommendation.
5. The operator approves or rejects the candidate and remains accountable for publication.
6. Only an approved record can appear as a Decision Brief in the Decision Center.

Evidence should show the same record or trace identifier across the source record, analysis/log entry, review state, and final brief. Use a synthetic or consented record and redact operator credentials.

## Evidence checklist

- [x] Live application and working homepage captured
- [x] Cloud Run revision, Ready status, traffic, health, and readiness verified
- [x] Vertex AI Gemini 2.5 Flash workflow evidenced in authenticated operations data
- [x] Firestore-backed Source Registry and Decision Center loaded successfully
- [x] Public GitHub repository and MIT License recorded
- [x] Public 1:46 YouTube demo verified
- [x] Product and operator screenshots captured with timestamps and captions
- [x] Authenticated Google Cloud Billing Reports captured
- [x] Cloud Logging requests, status, latency, and health evidence recorded
- [x] Human Verification queue, verified analyses, and published briefs captured
- [x] Secrets and personal data excluded from the evidence package

This package supports, but does not replace, the Devpost submission form. The official rules at <https://xprize.devpost.com/rules> control if requirements change.
