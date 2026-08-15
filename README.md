# LAFRYHI AI Radar

**Evidence-driven AI decision intelligence and governed agent execution for the Build with Gemini XPRIZE — Small Business Services.**

LAFRYHI AI Radar is a production-deployed system that turns governed source material into structured business decision intelligence with **Gemini on Vertex AI**, validates the output with deterministic controls, requires human authorization for consequential publication/action boundaries, and can carry an approved Decision Brief into a separately bounded Proof v1 execution and verified fulfillment flow.

> Governed source → controlled retrieval → Vertex AI Gemini → strict schema/policy validation → human verification → Decision Brief → bounded quote/authorization → testnet settlement verification → cryptographically verified fulfillment

## XPRIZE reviewer start here

See [`XPRIZE_FINAL_SUBMISSION_INDEX.md`](XPRIZE_FINAL_SUBMISSION_INDEX.md) for the shortest path through the submission evidence, production architecture, demo, Proof v1, and financial/customer evidence boundaries.

The restored privacy-safe production evidence index is in [`Product_Evidence/`](Product_Evidence/), and the evidence-grounded 500–1000 word submission narrative draft is [`XPRIZE_SUBMISSION_NARRATIVE.md`](XPRIZE_SUBMISSION_NARRATIVE.md).

## Verified production state

The repository contains evidence captured from the deployed product and authenticated Google Cloud surfaces on 2026-08-02. That evidence records:

- Cloud Run service `lafryhi-ai-radar` in `us-central1`, revision `lafryhi-ai-radar-00059-r8n`, Ready with 100% traffic at capture time.
- Vertex AI with production model `gemini-2.5-flash`.
- Firestore-backed production records and readiness.
- Secret Manager-backed runtime secrets.
- Cloud Logging / Monitoring evidence and successful health/readiness checks.
- Authenticated Human Verification states and published Decision Briefs.
- A public 1:46 demo video.

These are evidence-capture facts, not a promise that an old revision remains the currently serving revision. See the evidence register for provenance.

## What Gemini does

Gemini is the intelligence layer. Given controlled source content, it produces structured decision intelligence such as business significance, opportunity/risk assessment, confidence, recommended actions, evidence selection, and warnings. The application parses and validates Gemini output against strict schemas before it can enter the governed workflow.

Production evidence captured Vertex AI with `gemini-2.5-flash`. Mock/test adapters are for deterministic testing only and must not be represented as production AI evidence.

## What deterministic controls do

Application code — not the model — controls source admission, bounded retrieval, duplicate detection, schema validation, state transitions, policy checks, authorization correlation, idempotency, settlement verification, artifact hashing, and publication/fulfillment gates. Invalid or failed model output does not automatically become a public Decision Brief or an economic action.

## What the human does

A human operator remains accountable at the consequential authorization boundary. The operator reviews provenance, evidence, confidence, conflicts, and the generated recommendation, then approves or rejects the candidate. This is intentional governance: AI performs the analysis and recommendation work; deterministic software enforces invariants; the human authorizes consequential publication/action.

## Proof v1 — governed execution and verified fulfillment

Proof v1 extends the approved Decision Brief into a bounded seller/execution flow. The implementation includes a protected Radar export, a strict quote boundary, authorization correlation, a read-only Circle settlement verifier, Firestore-backed idempotent fulfillment, and a frozen artifact whose content is verified by SHA-256 digest.

The repository records a frozen Proof v1 fixture with:

- Network: `ARC-TESTNET` / quote network `eip155:5042002`
- Amount: `0.01 USDC`
- Circle transaction ID and transaction hash correlated to the fulfillment request
- Frozen Decision Brief artifact and SHA-256 content digest
- Idempotent fulfillment storage

**Important financial boundary:** Proof v1 is **testnet technical evidence**. The `0.01 USDC` testnet settlement is **not commercial revenue**, is not represented as a mainnet customer payment, and must not be counted as XPRIZE revenue evidence.

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
                    |
          bounded authorization
                    |
                    v
          Proof v1 seller boundary
                    |
                    v
   settlement verification + fulfillment

Operational layer: Cloud Logging, Cloud Monitoring, health/readiness checks,
Secret Manager references, and least-privilege Cloud Run identities.
```

## Evidence integrity and financial claims

This project follows a strict evidence rule: **do not fabricate users, customers, revenue, expenses, cloud runs, AI executions, testimonials, or transaction meaning.**

- Google Cloud billing evidence is expense/cost evidence, not revenue evidence.
- Testnet USDC is protocol/execution evidence, not revenue.
- Revenue and P&L values submitted to Devpost must come from genuine financial records.
- Customer evidence must come from real customers/testers with appropriate consent; sensitive customer contact details should be supplied through the submission channel when required, not committed to this public repository.

## Quick start

Requirements: Node.js 22+, npm, and — for the real AI path — a Google Cloud project with Vertex AI enabled and Application Default Credentials.

```powershell
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

Set `OPERATOR_ACCESS_TOKEN` to a random value of at least 20 characters, then open `/operator`. Never commit credential JSON, tokens, API keys, or `.env.local`.

## Commands

```text
npm run dev        local development
npm run typecheck  TypeScript validation
npm run lint       ESLint
npm test           Vitest suite
npm run build      production standalone build
```

## Configuration highlights

- `PERSISTENCE_ADAPTER=local|firestore`
- `OPERATOR_ACCESS_TOKEN` (server-only)
- `AI_ADAPTER=vertex`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GEMINI_PRIMARY_MODEL=gemini-2.5-flash`
- `GEMINI_FALLBACK_MODEL=gemini-2.5-flash`
- `FIRESTORE_DATABASE_ID`

See `.env.example` for the complete current configuration surface. Vertex AI uses Application Default Credentials locally and a least-privilege service identity on Cloud Run.

## Security and governance

The Radar path uses an explicit authoritative-domain allowlist, bounded HTTPS retrieval, response/content limits, publication metadata checks, SHA-256 duplicate detection, strict model-output validation, server-side secrets, and approval-gated publication. Proof v1 adds strict request schemas, service authentication boundaries, transaction correlation, read-only settlement verification, artifact digest verification, and idempotent fulfillment.

Security mechanisms evolve across repository phases. Historical phase documents describe the state at the time they were written; they should not be read as overriding the later production evidence package.

## Documentation

Start with:

- [`XPRIZE_FINAL_SUBMISSION_INDEX.md`](XPRIZE_FINAL_SUBMISSION_INDEX.md)
- [`XPRIZE_SUBMISSION_NARRATIVE.md`](XPRIZE_SUBMISSION_NARRATIVE.md)
- [`Product_Evidence/README.md`](Product_Evidence/README.md)
- [`Product_Evidence/PRODUCT_EVIDENCE.md`](Product_Evidence/PRODUCT_EVIDENCE.md)
- [`Product_Evidence/EVIDENCE_CHECKLIST.md`](Product_Evidence/EVIDENCE_CHECKLIST.md)
- [`GEMINI_XPRIZE_ARCHITECTURE.md`](GEMINI_XPRIZE_ARCHITECTURE.md)

Historical implementation and sprint documents remain in the repository to preserve engineering traceability. Statements such as “deployment has not occurred” inside early Phase 1 documents describe that historical phase only; later production evidence supersedes those historical status statements.

## Mission

LAFRYHI AI Radar is built around four rules:

- Truth before speed.
- Evidence before opinion.
- Humans authorize consequential boundaries.
- Every important conclusion and execution step should remain traceable.

The goal is not to hide human judgment behind an AI label. The goal is to make AI useful in day-to-day business operations while keeping evidence, controls, authorization, and execution independently inspectable.
