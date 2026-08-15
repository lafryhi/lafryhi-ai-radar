# Build with Gemini XPRIZE — Final Submission Index

**Project:** LAFRYHI AI Radar  
**Category:** Small Business Services  
**Purpose:** Give judges a short, evidence-first path through the production system without requiring them to reconstruct the project from historical phase documents.

## 1. Product and production evidence

Start with [`Product_Evidence/README.md`](Product_Evidence/README.md), then read [`Product_Evidence/PRODUCT_EVIDENCE.md`](Product_Evidence/PRODUCT_EVIDENCE.md).

The restored textual evidence record is based on production evidence captured on 2026-08-02. It records a deployed Cloud Run service, Vertex AI Gemini 2.5 Flash execution, Firestore-backed records, Secret Manager-backed runtime configuration, Cloud Logging/Monitoring evidence, Human Verification states, billing evidence, and the demo used in that dated evidence package.

Use [`Product_Evidence/EVIDENCE_CHECKLIST.md`](Product_Evidence/EVIDENCE_CHECKLIST.md) to distinguish dated verified evidence from final-deadline revalidation.

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

Deterministic application code controls admission, validation, duplicate detection, state transitions, policy, publication gates, authorization correlation, idempotency, and cryptographic verification. A human operator remains accountable for the consequential authorization boundary.

## 3. Google Cloud requirement

The captured production architecture uses:

- Vertex AI / Gemini (`gemini-2.5-flash` in the dated production evidence)
- Cloud Run
- Firestore
- Secret Manager
- Cloud Logging / Cloud Monitoring

Architecture: [`GEMINI_XPRIZE_ARCHITECTURE.md`](GEMINI_XPRIZE_ARCHITECTURE.md).

## 4. Proof v1 — execution beyond analysis

```text
Decision Brief
  -> quote
  -> governance / authorization reference
  -> Circle testnet settlement verification
  -> fulfillment
  -> SHA-256 artifact verification
```

Repository history includes the Proof v1 implementation and frozen artifact. The implementation records an Arc Testnet fixture for **0.01 USDC**, correlates Circle transaction identifiers, verifies settlement read-only, and stores/returns fulfillment idempotently against a frozen artifact digest.

**Proof v1 is testnet technical evidence, not commercial revenue.** The 0.01 USDC transaction is intentionally prominent because it demonstrates end-to-end execution, but it is excluded from the P&L.

## 5. Human versus AI responsibilities

| Layer | Responsibility |
|---|---|
| Gemini | Analyze controlled evidence and produce structured decision intelligence. |
| Deterministic software | Validate schemas, enforce policy/invariants, maintain provenance/state, protect boundaries, correlate authorization/transactions, verify hashes and idempotency. |
| Human operator | Review evidence and recommendation; approve/reject consequential publication/action boundaries. |
| Google Cloud | Run the production application and provide AI, persistence, secrets, logging, monitoring, health/readiness infrastructure. |

## 6. Final Devpost demo

**Selected final submission video:**

<https://www.youtube.com/watch?v=EW3NWJQ9Cko>

This is the video intended for the Devpost video field. Manually confirm Public visibility, playback, relevance, and duration under three minutes before final freeze.

**Historical provenance:** the 2026-08-02 evidence package recorded an earlier public 1:46 demo (`BDI_BVvO6tA`). That earlier URL remains in the dated Product Evidence record only so the historical evidence remains internally consistent.

## 7. Final financial position

Founder-confirmed final hackathon-period P&L:

| Field | Final value |
|---|---:|
| Commercial revenue | **US$0.00** |
| Codex / development-tooling expense | **US$150.00** |
| Google Cloud / hosting / Gemini | **US$0.00** |
| Marketing & customer acquisition | **US$0.00** |
| Other claimed expenses | **US$0.00** |
| **Total expenses** | **US$150.00** |
| **Net profit/(loss)** | **US$(150.00)** |

Retain genuine private billing evidence supporting the US$150 Codex expense. Google Cloud credits are not revenue. Proof v1 testnet USDC is not revenue.

## 8. Customer evidence — transparent final status

| Field | Final status |
|---|---|
| Paying commercial customers | **0** |
| Confirmed external testers/users available as submission evidence | **0** |
| Testimonials | **None claimed** |

LAFRYHI AI Radar is in its initial production and validation stage. Internal operator executions, Gemini runs, Decision Briefs and Proof v1 activity are product evidence and are not relabeled as customer traction.

## 9. Narrative

Use [`XPRIZE_SUBMISSION_NARRATIVE.md`](XPRIZE_SUBMISSION_NARRATIVE.md) for the required 500–1000 word narrative. It covers day-to-day AI use, human-versus-AI responsibilities, economic opportunity, category impact, Proof v1, and evidence integrity.

## 10. Final freeze checklist

Before the Devpost deadline:

- [x] Live product manually checked by the founder and confirmed working during final submission preparation.
- [ ] Confirm final video `EW3NWJQ9Cko` is Public/playable and under three minutes.
- [ ] Confirm repository contains all necessary source code and required judge access.
- [x] Prepare the 500–1000 word evidence-grounded narrative.
- [x] Record commercial revenue as US$0.00.
- [x] Record final P&L: US$0 revenue / US$150 expenses / US$150 net loss.
- [x] Record marketing/customer-acquisition spend as US$0.00.
- [x] Keep Proof v1 0.01 USDC prominent as testnet technical evidence, not revenue.
- [x] Report customer evidence transparently: 0 customers / 0 confirmed external testers / no testimonials.
- [ ] Preserve genuine private Codex billing evidence.
- [ ] Select/upload final product-running evidence required by the Devpost form.
- [ ] Resolve corporate ID only if applicable.
- [ ] Re-open every submitted link from a logged-out/private browser where possible.
- [ ] After the deadline, do not edit repository, replace video, or change submission materials until competition rules permit it.

## 11. Historical-document warning

The repository preserves historical Phase 1 and sprint documents for engineering traceability. Early statements that deployment had not yet occurred describe their historical phase only. For submission status, prefer the dated production evidence record and this final index.

## Evidence policy

**No fabricated evidence. No inflated claims. No conversion of testnet activity into revenue. No private customer or financial data committed to the public repository.**
