# LAFRYHI AI Radar — Product Evidence

**Prepared for:** Build with Gemini XPRIZE (Devpost)  
**Category:** Small Business Services  
**Evidence capture date:** 2026-08-02  
**Captured production revision:** `lafryhi-ai-radar-00059-r8n`  
**Current submission note:** Proof v1 was added after this evidence capture and is documented separately in the repository and final submission index.

## Evidence provenance

This document restores the textual production-evidence record originally published in repository commit `20db45e098b04290e750126f7efe2be600bea58e` (`release: publish XPRIZE production evidence`). It preserves dated evidence facts without claiming that the captured revision is still the currently serving revision.

## Project links

| Item | Evidence status at capture |
|---|---|
| Project | LAFRYHI AI Radar |
| Live Cloud Run product | Verified at capture time |
| GitHub repository | Public and verified |
| Demo video | Public, 1 minute 46 seconds |

Demo video recorded in the evidence package: <https://www.youtube.com/watch?v=BDI_BVvO6tA>

## Verified Google Cloud production evidence

The 2026-08-02 capture recorded:

- **Cloud Run:** service `lafryhi-ai-radar`, region `us-central1`, revision `lafryhi-ai-radar-00059-r8n`, Ready and receiving 100% traffic at capture time.
- **Vertex AI / Gemini:** production workflow configured for `gemini-2.5-flash`; authenticated operator records showed completed Gemini analyses.
- **Firestore:** readiness reported Firestore `ok`; authenticated Source Registry and Decision Center data loaded successfully.
- **Secret Manager:** runtime operator/scheduler secrets were Secret Manager-backed; no secret values were included in the public evidence narrative.
- **Observability:** Cloud Run request logs, latency, health/readiness and revision/traffic evidence were captured.
- **Human Verification:** authenticated operator views showed awaiting-review, verified and published states.

The captured Operator Dashboard recorded 6 completed runs, 3 awaiting verification, 3 verified analyses and 3 published Decision Briefs.

## AI workflow

```text
Governed source
  -> controlled fetch + provenance
  -> Gemini on Vertex AI
  -> structured decision intelligence
  -> strict schema validation
  -> deterministic policy checks
  -> Human Verification
  -> approved Decision Brief
```

Gemini produces structured analysis including business significance, opportunity/risk, confidence, recommendations, evidence selection and warnings. Application code controls source admission, validation, duplicate detection, workflow state and publication gates. A human operator reviews the evidence and remains accountable for the approval/rejection boundary.

## Proof v1 extension

After the 2026-08-02 production evidence capture, the repository added Proof v1, which extends an approved Decision Brief through a bounded execution path:

```text
Decision Brief
  -> quote
  -> governance / authorization reference
  -> Circle settlement verification
  -> fulfillment
  -> SHA-256 artifact verification
```

The frozen Proof v1 fixture uses **Arc Testnet**, `0.01 USDC`, transaction correlation, a read-only Circle settlement verifier, Firestore-backed idempotent fulfillment and a frozen artifact digest.

**Proof v1 testnet activity is technical execution evidence, not commercial revenue.**

## Evidence integrity

The original evidence package explicitly recorded a no-fabrication and privacy policy. The final submission must continue to follow it:

- do not invent users, customers, revenue, expenses, testimonials or transactions;
- do not present test/mocked AI output as a real production Gemini execution;
- do not convert testnet USDC into revenue;
- do not publish customer contact details, bank statements, tokens, API keys or secret values in this public repository;
- use dated captures as dated evidence rather than implying they prove a continuously unchanged deployment.

## Financial evidence boundary

The 2026-08-02 Google Cloud Billing capture showed current-period project spend of **US$0.00** at that capture time and remaining trial credit of **US$299.25 of US$300.00**. This is dated cost/billing evidence only. It must not be treated as current final-period expense without a fresh check, and it is not revenue evidence.

The final Devpost P&L must use genuine final hackathon-period values from financial records.

## Customer evidence boundary

Customer/contact/testimonial evidence required by the submission must be genuine. Private customer contact information should be supplied through the appropriate judging/submission mechanism and not committed to this public repository.

## Reviewer navigation

Return to [`../XPRIZE_FINAL_SUBMISSION_INDEX.md`](../XPRIZE_FINAL_SUBMISSION_INDEX.md) for the final checklist and submission boundaries.
