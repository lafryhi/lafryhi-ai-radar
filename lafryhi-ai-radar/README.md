# LAFRYHI AI Radar

**Decision Intelligence for Small Businesses**

> Transform Trusted AI Signals into Confident Business Decisions

LAFRYHI AI Radar is a Gemini-powered Decision Intelligence Platform that transforms trusted AI signals into actionable business decisions for small businesses.

## Editorial Policy Engine

Phase 3 adds a deterministic, model-independent layer between validated Decision
Intelligence and mandatory human review:

`Signal Intelligence → Decision Intelligence → Editorial Policy Engine → Human Review`

It preserves raw model decisions, produces a separate explainable effective position, and
never publishes automatically. The versioned constitution and policy-only replay workflow
are documented in [docs/EDITORIAL_POLICY_ENGINE.md](docs/EDITORIAL_POLICY_ENGINE.md).
Production remains `gemini-2.5-flash`; no candidate promotion or deployment is implied.

Phase 4 adds local controlled-shadow readiness certification: a fail-closed preflight,
version compatibility, complete decision-chain trace IDs, a machine-readable checklist,
risk register, and secret-free release manifest. See
[CONTROLLED_SHADOW_SPEC.md](docs/CONTROLLED_SHADOW_SPEC.md) and
[SHADOW_READINESS_CERTIFICATION.md](docs/SHADOW_READINESS_CERTIFICATION.md). Readiness
does not enable shadow execution or authorize model calls, traffic, deployment, canary,
publication, or candidate promotion.

Phase 5.1 repairs the offline harness with one canonical privacy-safe forbidden-term
detector and strict evaluation v2.6/report v1.1 contracts. Invalid reports expose
observations only and cannot emit migration recommendations. The first shadow report
remains invalid; this repair does not authorize a live rerun.

Phase 3.1 calibrates constitution `editorial-policy-v1.1`. Valid
`INSUFFICIENT_EVIDENCE` is preserved unless explicit structured context proves that
the uncertainty is conflict, pending verification, defer, policy uncertainty, or a
human-review-only state with sufficient retained evidence. Strong `ACT_NOW` requires
explicit authority, high material impact, sufficient evidence, qualified confidence,
and no conflict, pending, or promotional condition. Normal application review remains
mandatory and is reported separately from additional policy-triggered review.

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

## Gemini Migration Stabilization

The production model remains `gemini-2.5-flash`; no model cutover has occurred. Model selection is environment-driven through `GEMINI_PRIMARY_MODEL`, with legacy `GEMINI_MODEL` compatibility. Retry and fallback behavior are controlled and the configured fallback remains `gemini-2.5-flash`. Shadow mode is implemented for later evaluation but is disabled by default and cannot affect production results. Deployment of a candidate model requires a later validation phase.

### Phase 2: Candidate Evaluation

Candidate evaluation is local, opt-in, redacted, and isolated from persistence, publication, cookies, sessions, and public API responses. `gemini-2.5-flash` remains production and Cloud Run has not been changed. `gemini-3-flash-preview` may be supplied only as an evaluation example; it is not recommended or approved for production. Passing evaluation does not authorize production use—a generally available model and a separate canary approval phase are required. See `docs/GEMINI_MIGRATION_EVALUATION.md`.

### Phase 2.5: Candidate Availability Probe

Candidate reachability is never inferred from documentation. Zero-call validation and dry-run commands precede an explicitly authorized tiny structured-output probe. Real calls require evaluation enablement, exact allowlisting, `GEMINI_EVALUATION_ALLOW_REAL_CALLS=true`, and an operator run label. The first smoke comparison is limited to one marked synthetic case. Lifecycle stage is operator-supplied; preview, experimental, and unknown candidates cannot become canary-eligible. A successful probe means only `AVAILABLE_FOR_EVALUATION`. See `docs/GEMINI_CANDIDATE_PROBE.md`.

Probe diagnostics distinguish endpoint/model reachability from JSON parsing, schema conformance, and full production compatibility. A model response containing prose-wrapped or Markdown-fenced JSON proves reachability but fails the strict structured-output contract. Such a result is `REACHABLE_BUT_CONTRACT_FAILED`, not model unavailability, and blocks the smoke evaluation.

Evaluation metrics also preserve each pipeline boundary independently: transport/request success, response receipt, raw JSON parsing, versioned schema matching, application validation, and full two-stage completion. Evaluation integrity is reported as `VALID`, `INVALID_DATASET_EXPECTATION`, `INVALID_HARNESS`, or `INCONCLUSIVE`. Non-valid evaluations return `INCONCLUSIVE` instead of attributing harness defects to a model.

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

## Product Evidence

Devpost submission evidence is organized in [`Product_Evidence/`](Product_Evidence/README.md):

- [Product evidence narrative](Product_Evidence/PRODUCT_EVIDENCE.md)
- [Evidence checklist](Product_Evidence/EVIDENCE_CHECKLIST.md)
- [Evidence capture template](Product_Evidence/PRODUCT_EVIDENCE_TEMPLATE.md)
- [Printable product evidence PDF](Product_Evidence/PRODUCT_EVIDENCE.pdf)

## Phase 5.2.1: Budget-constrained shadow harness

The live availability gate is integrated into evaluation case 1. Its four
baseline/candidate stage requests are reused in the report, followed by 56
requests for cases 2–15. No separate smoke request is made, so the complete plan
is exactly 60 requests. The run aborts before case 2 if the gate fails, and a
shared counter refuses request 61.
