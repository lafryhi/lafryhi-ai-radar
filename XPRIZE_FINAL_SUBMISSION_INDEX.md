# Build with Gemini XPRIZE — Final Submission Index

**Project:** LAFRYHI AI Radar  
**Category:** Small Business Services  
**Purpose:** Give judges a short, evidence-first path through the production system without requiring them to reconstruct the project from historical phase documents.

## 1. Product and production evidence

Start with [`submission/product-evidence/README.md`](submission/product-evidence/README.md), then read [`submission/product-evidence/PRODUCT_EVIDENCE.md`](submission/product-evidence/PRODUCT_EVIDENCE.md).

The evidence package captured on 2026-08-02 records a deployed Cloud Run service, Vertex AI Gemini 2.5 Flash execution, Firestore-backed records, Secret Manager-backed runtime configuration, Cloud Logging/Monitoring evidence, Human Verification states, product screenshots, billing evidence, and a public 1:46 demo video.

Use [`submission/product-evidence/PRODUCT_EVIDENCE_TEMPLATE.md`](submission/product-evidence/PRODUCT_EVIDENCE_TEMPLATE.md) as the provenance/register view and [`submission/product-evidence/EVIDENCE_CHECKLIST.md`](submission/product-evidence/EVIDENCE_CHECKLIST.md) as the technical completion checklist.

## 2. AI-operated workflow

The core governed workflow is:

```text
Governed source
  -> controlled retrieval/provenance
  -> Gemini on Vertex AI
  -> structured decision intelligence
  -> schema + deterministic policy validation
  -> Human Verification
  -> approved Decision Brief
```

Gemini performs the intelligence work: structured analysis, business significance, opportunity/risk assessment, confidence, recommended action, evidence selection, and warnings.

Deterministic application code controls admission, validation, duplicate detection, state transitions, policy, publication gates, authorization correlation, idempotency, and cryptographic verification.

A human operator is accountable for the consequential authorization boundary. Model output is not automatically published merely because Gemini produced it.

## 3. Google Cloud requirement

The production architecture uses Google Cloud products including:

- Vertex AI / Gemini (`gemini-2.5-flash` in the captured production evidence)
- Cloud Run
- Firestore
- Secret Manager
- Cloud Logging / Cloud Monitoring

Architecture: [`GEMINI_XPRIZE_ARCHITECTURE.md`](GEMINI_XPRIZE_ARCHITECTURE.md).

## 4. Proof v1 — execution beyond analysis

Proof v1 extends a Decision Brief across a bounded seller boundary:

```text
Decision Brief
  -> quote
  -> governance / authorization reference
  -> Circle testnet settlement verification
  -> fulfillment
  -> SHA-256 artifact verification
```

Repository history includes the Proof v1 implementation and frozen artifact. The implementation records an Arc Testnet fixture for `0.01 USDC`, correlates the Circle transaction identifiers, verifies settlement read-only, and returns/stores fulfillment idempotently against a frozen artifact digest.

### Required interpretation

**Proof v1 is testnet technical evidence, not commercial revenue.**

Do not count the `0.01 USDC` testnet transaction as revenue. Do not describe it as a mainnet customer purchase or as evidence of a commercial sale.

## 5. Human versus AI responsibilities

| Layer | Responsibility |
|---|---|
| Gemini | Analyze controlled evidence and produce structured decision intelligence. |
| Deterministic software | Validate schemas, enforce policy/invariants, maintain provenance/state, protect boundaries, correlate authorization/transactions, verify hashes and idempotency. |
| Human operator | Review evidence and recommendation; approve/reject consequential publication/action boundaries. |
| Google Cloud | Run the production application and provide AI, persistence, secrets, logging, monitoring, health/readiness infrastructure. |

This separation is intentional. The system is designed to make AI operationally useful while keeping consequential actions governed and auditable.

## 6. Demo

The 2026-08-02 evidence package records a public YouTube demo of 1 minute 46 seconds:

<https://www.youtube.com/watch?v=BDI_BVvO6tA>

Before final Devpost submission, confirm that the single video selected in the submission is public/playable and remains under three minutes while visibly demonstrating live AI operation and key decision/execution boundaries.

## 7. Revenue, expenses, and P&L — truth boundary

The hackathon submission requires genuine financial evidence. This repository must not manufacture it.

- **Revenue:** use only genuine commercial receipts/bank/processor evidence. If genuine project revenue is zero, report zero rather than converting testnet activity into revenue.
- **Expenses:** disclose genuine hackathon-period expenses, including marketing/customer-acquisition spend even when zero. Google Cloud billing evidence is cost/expense evidence.
- **P&L:** calculate it only from genuine revenue and expense records.
- **Corporate ID:** include it only if genuinely available and appropriate for the submission.

Sensitive financial documents should normally be uploaded through the submission mechanism rather than committed to this public repository.

## 8. Customer evidence — privacy and truth boundary

Use only real customer/tester contact information, testimonials, or feedback that actually exists and is appropriate to submit. Do not invent customers or testimonials.

Because this is a public repository, do **not** commit private customer phone numbers, email addresses, bank records, or other sensitive evidence here. Supply required private evidence through the Devpost/judging channel where appropriate.

## 9. Narrative requirement

The final 500–1000 word submission narrative should explicitly cover:

- how AI is used day to day;
- what Gemini/agents do versus what the human does;
- how deterministic governance constrains AI execution;
- jobs/economic opportunities the business creates or could enable beyond the founder;
- the story of building and operating the business this way;
- Small Business Services category impact;
- honest current revenue/customer status and evidence boundaries.

The narrative should describe verified capabilities, not planned features as if they were already live.

## 10. Repository and final freeze checklist

Before the Devpost deadline:

- [ ] Confirm the repository contains all necessary source code.
- [ ] Confirm judge access requirements from the Devpost checklist are satisfied.
- [ ] Confirm the final public demo video is playable and under three minutes.
- [ ] Confirm the 500–1000 word narrative is in the Devpost submission.
- [ ] Upload genuine revenue evidence / state genuine zero revenue as applicable.
- [ ] Upload genuine P&L and hackathon-period expenses, including marketing/customer-acquisition spend even if zero.
- [ ] Upload/select production evidence: agent execution logs, API usage, dashboards, screenshots.
- [ ] Provide genuine customer evidence if available; do not fabricate missing evidence.
- [ ] Re-open every submitted link from a logged-out/private browser where possible.
- [ ] After the deadline, do not edit the repository, replace the video, or change submission materials until the competition permits it.

## 11. Historical-document warning

This repository preserves historical Phase 1 and sprint documents for engineering traceability. Some early documents correctly stated at that earlier time that deployment or production usage had not yet occurred. Those statements are historical snapshots and must not be used to characterize the later production state. For submission status, prefer the dated production evidence package and this final index.

## Evidence policy

**No fabricated evidence. No inflated claims. No conversion of testnet activity into revenue. No private customer data committed to the public repository.**

The submission should be strongest because every important claim can be traced to code, production evidence, a real record, or an explicitly stated limitation.
