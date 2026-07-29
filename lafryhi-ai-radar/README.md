# LAFRYHI AI Radar

**Decision Intelligence for Small Businesses**

> Transform Trusted AI Signals into Confident Business Decisions

LAFRYHI AI Radar is a Gemini-powered Decision Intelligence Platform that transforms trusted AI signals into actionable business decisions for small businesses.

The platform monitors governed sources, uses Gemini on Vertex AI to produce structured decision intelligence, and requires Human Verification before a Decision Brief becomes available in the Decision Center.

The implemented path is:

> trusted signal → controlled retrieval → Gemini Analysis → strict schema validation → Human Verification → Decision Brief

The Decision Center remains evidence-first. It shows no Decision Brief until a real trusted signal has completed Gemini Analysis and Human Verification. No sample records are seeded.

## Product experience

- **Trusted Signals:** governed official and verified sources with provenance and duplicate controls.
- **Gemini Intelligence:** structured insights covering business significance, opportunity, risk, confidence, and Recommended Actions.
- **Decision Briefs:** concise, evidence-backed guidance focused on Business Impact and what to do next.
- **Human Verification:** Gemini advises; a human remains responsible for every publication decision.

LAFRYHI AI Radar is an independent product. References to Gemini and Google Cloud describe the technologies used and do not imply affiliation with or endorsement by Google.

## Quick start

Requirements: Node.js 22+, npm, and, for the real Gemini path, a Google Cloud project with Vertex AI enabled and Application Default Credentials.

```powershell
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

Set `OPERATOR_ACCESS_TOKEN` to a random value of at least 20 characters, then open `/operator`. The temporary token is stored only in an HTTP-only, same-site cookie. It is not full production authentication.

## Commands

```text
npm run dev        local development
npm run typecheck  TypeScript validation
npm run lint       ESLint
npm test           Vitest suite
npm run build      production standalone build
```

## Configuration

- `PERSISTENCE_ADAPTER=local|firestore`
- `LOCAL_DATA_PATH=.data/radar.json`
- `OPERATOR_ACCESS_TOKEN` (server-only)
- `AI_ADAPTER=vertex` (the mock cannot be selected at runtime)
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GEMINI_MODEL`
- `FIRESTORE_DATABASE_ID`

Vertex AI uses Application Default Credentials. Locally, authenticate with `gcloud auth application-default login` or use an approved service-account mechanism. On Cloud Run, assign a least-privilege service identity with Vertex AI User and the required Firestore access. Never commit credential JSON or `.env.local`.

For Firestore, create a Native mode database and set `PERSISTENCE_ADAPTER=firestore`. Server-side repositories validate every read and write against the same Zod domain schemas used locally.

## Cloud Run path

The Dockerfile creates a Next.js standalone server listening on port 8080. Build and deploy from a configured Google Cloud project; set runtime variables and Secret Manager references in Cloud Run.

The dependency-free staging health endpoint is `/api/health`. The minimal resource plan and guarded command sequence are in `GEMINI_XPRIZE_PHASE2_CLOUD_SETUP.md`. Deployment evidence and the staged rollout are recorded in the XPRIZE evidence documents.

## Security

Only HTTPS URLs from registered trusted sources are accepted. Fetches have a 10-second timeout, HTML-only content check, 1 MB response limit, minimum-content check, publication-date requirement, and SHA-256 duplicate detection. Gemini JSON is parsed and schema-validated before persistence. Failing runs never create a Decision Brief. Operator secrets stay server-side and cookies are HTTP-only. React escapes rendered text; external links use safe `rel` attributes. Errors shown to the operator are bounded, while the Decision Center exposes no processing failures.

The token guard is temporary and must be replaced with identity-based authentication and role authorization before wider production use.

## Documentation

- [Go-To-Market Business Documentation](docs/business/README.md) — Business Bible, 90-day roadmap, customer discovery, growth metrics, content strategy, launch playbook, and decision log.
- `GEMINI_XPRIZE_PHASE1_IMPLEMENTATION.md`
- `GEMINI_XPRIZE_PHASE1_EVIDENCE.md`
- `GEMINI_XPRIZE_PHASE7_DECISION_INTELLIGENCE.md`
- Historical phase and competition evidence documents remain at the repository root.

Built with Google Gemini and Google Cloud.
