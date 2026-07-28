# LAFRYHI AI Radar

Phase 1 production-capable vertical slice for the Build with Gemini XPRIZE, Small Business Services category.

The implemented path is:

> authoritative URL → controlled fetch → Vertex AI Gemini → strict schema validation → operator review → approved public Radar item

The public feed is intentionally empty until a real source has successfully completed processing and a human approves it. No sample records are seeded.

## Quick start

Requirements: Node.js 22+, npm, and (for the real AI path) a Google Cloud project with Vertex AI enabled and Application Default Credentials.

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
- `AI_RECOVERY_ENABLED=true|false` (Phase 4.1 validation engine; defaults to disabled)
- `ATOMIC_ANALYSIS_FINALIZATION_ENABLED=true|false` (Phase 4.3 atomic readiness; defaults to disabled)
- `FIRESTORE_DATABASE_ID`

Vertex AI uses Application Default Credentials. Locally, authenticate with `gcloud auth application-default login` or use an approved service-account mechanism. On Cloud Run, assign a least-privilege service identity with Vertex AI User and the required Firestore access. Never commit credential JSON or `.env.local`.

For Firestore, create a Native mode database and set `PERSISTENCE_ADAPTER=firestore`. Server-side repositories validate every read/write against the same Zod domain schemas used locally.

## Cloud Run path

The Dockerfile creates a Next.js standalone server listening on port 8080. Build and deploy from a configured Google Cloud project; set runtime variables and Secret Manager references in Cloud Run. The Phase 1 work does not claim that deployment has occurred.

The dependency-free staging health endpoint is `/api/health`. The exact minimal resource plan and guarded command sequence are in `GEMINI_XPRIZE_PHASE2_CLOUD_SETUP.md`. Cloud provisioning must not begin until the authenticated project is inspected and explicitly confirmed.

## Security

Only HTTPS URLs on the explicit Google authoritative-domain allowlist are accepted. Fetches have a 10-second timeout, HTML-only content check, 1 MB response limit, minimum-content check, publication-date requirement, and SHA-256 duplicate detection. Gemini JSON is parsed and schema-validated before persistence. Failing runs never publish. Operator secrets stay server-side and cookies are HTTP-only. React escapes rendered text; external links use safe `rel` attributes. Errors shown to the operator are bounded, while the public feed exposes no processing failures.

The token guard is temporary and must be replaced with Firebase Authentication and role-based authorization after Phase 1.

## Documentation

- `GEMINI_XPRIZE_PHASE1_IMPLEMENTATION.md`
- `GEMINI_XPRIZE_PHASE1_EVIDENCE.md`
- `GEMINI_XPRIZE_PHASE4_1_FAILURE_RECOVERY.md`
- `GEMINI_XPRIZE_PHASE4_2_BOUNDED_RECOVERY.md`
- `GEMINI_XPRIZE_PHASE4_3_ATOMIC_READINESS.md`
- The five Phase 0 documents remain at the root.

## AI Radar Mission Control

AI Radar transforms trusted AI information into verified intelligence, editorial insight, and publication-ready content through a transparent human-centered workflow.

- Truth before speed.
- Evidence before opinion.
- Humans make the final publishing decision.
- Every important conclusion must remain traceable.

For the deterministic operator demo, set `AI_RADAR_DEMO_MODE=true` and open `/operator/mission-control`. See `docs/SPRINT_1_DEMO_EXECUTION_PLAN.md` for local instructions and boundaries.

Mission Control also supports an explicit Live Collection mode backed by the trusted Source Registry and existing RSS discovery safeguards. Live collection stops before Vertex AI analysis; see `docs/SPRINT_3_1_LIVE_SOURCE_COLLECTION.md`.

Live Collection can now analyze bounded, traceable records through the existing Vertex AI client with strict schema validation and mandatory human review. Ranking, editorial, report, and video stages remain deferred; see `docs/SPRINT_3_2_LIVE_VERTEX_ANALYSIS.md`.
