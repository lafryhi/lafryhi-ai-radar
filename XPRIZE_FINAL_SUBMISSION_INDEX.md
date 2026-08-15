# Build with Gemini XPRIZE — Final Submission Index

**Project:** LAFRYHI AI Radar  
**Category:** Small Business Services  
**Purpose:** Give judges a short, evidence-first path through the production system without requiring them to reconstruct the project from historical phase documents.

## 1. Product and production evidence

Start with [`Product_Evidence/README.md`](Product_Evidence/README.md), then read [`Product_Evidence/PRODUCT_EVIDENCE.md`](Product_Evidence/PRODUCT_EVIDENCE.md).

The restored textual evidence record is based on the production evidence captured on 2026-08-02. It records a deployed Cloud Run service, Vertex AI Gemini 2.5 Flash execution, Firestore-backed records, Secret Manager-backed runtime configuration, Cloud Logging/Monitoring evidence, Human Verification states, billing evidence, and a public 1:46 demo video.

Use [`Product_Evidence/EVIDENCE_CHECKLIST.md`](Product_Evidence/EVIDENCE_CHECKLIST.md) to distinguish **dated verified evidence** from **final-deadline revalidation still required**.

Historical binary screenshots and the PDF are not blindly restored on this branch because dated captures should first pass a final privacy/freshness review before being presented as deadline evidence.

## 2. AI-operated workflow

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

The captured production architecture uses:

- Vertex AI / Gemini (`gemini-2.5-flash` in the dated production evidence)
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

Repository history includes the Proof v1 implementation and frozen artifact. The implementation records an Arc Testnet fixture for `0.01 USDC`, correlates Circle transaction identifiers, verifies settlement read-only, and stores/returns fulfillment idempotently against a frozen artifact digest.

**Proof v1 is testnet technical evidence, not commercial revenue.** Do not count the `0.01 USDC` testnet transaction as revenue or describe it as a mainnet customer purchase.

## 5. Human versus AI responsibilities

| Layer | Responsibility |
|---|---|
| Gemini | Analyze controlled evidence and produce structured decision intelligence. |
| Deterministic software | Validate schemas, enforce policy/invariants, maintain provenance/state, protect boundaries, correlate authorization/transactions, verify hashes and idempotency. |
| Human operator | Review evidence and recommendation; approve/reject consequential publication/action boundaries. |
| Google Cloud | Run the production application and provide AI, persistence, secrets, logging, monitoring, health/readiness infrastructure. |

## 6. Demo

The 2026-08-02 evidence package records a public YouTube demo of 1 minute 46 seconds:

<https://www.youtube.com/watch?v=BDI_BVvO6tA>

Before final Devpost submission, re-confirm that the single selected video is public/playable, under three minutes, and visibly demonstrates the live AI workflow and the important decision/execution boundaries.

## 7. Revenue, expenses, and P&L — truth boundary

The submission must use genuine financial evidence.

- **Revenue:** use only genuine commercial receipts/bank/processor evidence. If genuine project revenue is zero, report zero.
- **Expenses:** disclose genuine hackathon-period expenses, including marketing/customer-acquisition spend even when zero.
- **Google Cloud billing:** dated cost evidence, not revenue. The 2026-08-02 capture showed US$0.00 current-period spend at that moment; final-period expense still requires reconciliation.
- **P&L:** calculate only from genuine final revenue and expense records.
- **Corporate ID:** include only if genuinely available and appropriate for the submission.

Sensitive financial documents should be uploaded through the appropriate submission mechanism rather than committed to this public repository.

## 8. Customer evidence — privacy and truth boundary

Use only real customer/tester contact information, testimonials, or feedback that actually exists and is appropriate to submit. Do not invent customers or testimonials. Do not commit private customer phone numbers, email addresses, bank records, or other sensitive evidence to this public repository.

## 9. Narrative — drafted

An evidence-grounded narrative draft is now available at [`XPRIZE_SUBMISSION_NARRATIVE.md`](XPRIZE_SUBMISSION_NARRATIVE.md). It covers:

- day-to-day AI use;
- Gemini versus deterministic software versus human responsibilities;
- governed execution and Proof v1;
- jobs/economic opportunities beyond the founder;
- Small Business Services impact;
- truthful revenue/customer/evidence boundaries.

Before copying it into Devpost, do a final word-count and form-specific review against the then-current competition requirements.

## 10. Repository and final freeze checklist

Before the Devpost deadline:

- [ ] Confirm the repository contains all necessary source code.
- [ ] Confirm judge access requirements are satisfied.
- [ ] Re-confirm the live product URL.
- [ ] Re-confirm the final public demo video is playable and under three minutes.
- [x] Prepare a 500–1000 word evidence-grounded narrative draft.
- [ ] Reconcile genuine revenue evidence / genuine zero revenue as applicable.
- [ ] Reconcile genuine P&L and hackathon-period expenses, including marketing/customer-acquisition spend even if zero.
- [ ] Select/refresh production evidence: agent execution logs, API usage, dashboards and screenshots.
- [ ] Provide genuine customer evidence if available; do not fabricate missing evidence.
- [ ] Re-open every submitted link from a logged-out/private browser where possible.
- [ ] After the deadline, do not edit the repository, replace the video, or change submission materials until the competition permits it.

## 11. Historical-document warning

This repository preserves historical Phase 1 and sprint documents for engineering traceability. Some early documents correctly stated at that earlier time that deployment or production usage had not yet occurred. Those statements are historical snapshots and must not be used to characterize the later production state. For submission status, prefer the dated production evidence record and this final index.

## Evidence policy

**No fabricated evidence. No inflated claims. No conversion of testnet activity into revenue. No private customer data committed to the public repository.**
