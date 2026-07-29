# LAFRYHI AI Radar — Execution Roadmap

**Plan window:** July 24–August 17, 2026  
**Hard deadline:** August 17, 2026, 1:00 PM PT  
**Internal submission target:** August 16, 2026  
**Category:** Small Business Services

> **Phase 1 implementation update (July 24, 2026):** The application skeleton, controlled single-source pipeline, Vertex AI adapter, schema validation, repository adapters, operator review, approval-gated feed, tests, and Cloud Run container path are implemented locally. Real Google Cloud configuration/deployment and live-source evidence remain outstanding; later milestones are not started.

## Critical-path rules

- Build one thin production path before broadening coverage.
- Free + Pro are the launch plans; Business is deferred unless a buyer requires it.
- The first production cohort must begin before feature completeness.
- Every production release must add or protect competition evidence.
- August 12 is the feature-freeze target; August 13–16 are for reliability, evidence, and pitch.
- Confirm the portal’s timezone display; 1:00 PM Pacific Daylight Time corresponds to 8:00 PM UTC and is expected to be 9:00 PM in Casablanca on August 17.

## Sequence overview

| Seq. | Dates | Milestone | Exit condition |
|---:|---|---|---|
| 1 | Jul 24–25 | Audit and stabilization | Baseline accepted; Git and app skeleton ready |
| 2 | Jul 25–29 | Core MVP | Fixture-backed end-to-end product UX works |
| 3 | Jul 27–31 | AI pipeline | One real source becomes a reviewed published item |
| 4 | Jul 28–Aug 2 | Google Cloud integration | Staging runs on Google Cloud with scheduled ingestion |
| 5 | Jul 30–Aug 3 | Authentication and personalization | External tester receives personalized content |
| 6 | Aug 1–7 | Payment readiness | Real production Pro checkout and entitlement work |
| 7 | Aug 3–7 | Production launch | Public production service and operating policies live |
| 8 | Aug 3–12 | User acquisition | Real external usage cohort and feedback evidenced |
| 9 | Aug 7–12 | Revenue validation | Real non-team payments and revenue evidence recorded |
| 10 | Aug 10–16 | Submission evidence and pitch | Submission package complete one day early |

Dates overlap deliberately; dependencies refer to usable vertical slices, not completion of every preceding item.

## 1. Audit and stabilization — July 24–25

**Objective:** Establish an honest baseline and a safe implementation foundation without losing useful work.

**Exact deliverables**

- The five canonical Phase 0 documents.
- Named product, engineering, AI quality, growth, and submission owners.
- Confirmed access to domain/DNS, Google Cloud billing/project, and payment-business documents.
- Phase 1 only: initialized Git repository, ignore rules, untouched baseline commit, runtime/toolchain decision, application directory, lockfile, environment example, and documented local commands.
- Initial issue board mapped to roadmap exits.

**Dependencies:** Workspace access and owner decisions on runtime, cloud account, domain, and legal payment entity.

**Validation criteria**

- Every non-empty existing file has been inspected.
- Baseline separates working code from plans/placeholders.
- No Phase 0 product implementation, commit, or push occurred.
- In Phase 1, a clean clone can install and run the skeleton using documented commands.

**Competition criteria supported:** Execution credibility, delivery risk reduction, evidence integrity.

**Risks:** No version control, missing account access, time loss to tooling, return to broad ecosystem scope.

**Estimated sequence:** Accept scope → assign owners → confirm accounts → initialize repository/toolchain in Phase 1.

## 2. Core MVP — July 25–29

**Objective:** Deliver the exact decision-support journeys with typed fixtures before coupling every screen to ingestion.

**Exact deliverables**

- Radar-focused landing and pricing copy using preserved responsive structure/styles.
- Typed schemas for profile, source, radar item, opportunity, brief, mission, pipeline run, and subscription entitlement.
- Feed, item detail, Opportunity Radar, Daily Brief, AI Mission, and minimal operator review views.
- Fixture records containing every required field and explicit verification state.
- Loading, empty, error, expired-opportunity, and unauthorized states.
- Accessible navigation and responsive smoke coverage.

**Dependencies:** Milestone 1 app skeleton and accepted product scope.

**Validation criteria**

- A tester can move from landing to feed, inspect provenance, review an opportunity, read a brief, and understand a mission.
- No route claims unsupported capabilities.
- Schema/type validation rejects records missing required provenance or opportunity fields.
- Project-defined typecheck, lint, tests, and production build pass.

**Competition criteria supported:** Category impact, viable MVP, trustworthy discovery, actionable recommendations.

**Risks:** Visual redesign consumes time; fixtures disguise missing backend; scope creep.

**Estimated sequence:** Schemas → fixture adapter → core routes → states/accessibility → build validation.

## 3. AI pipeline — July 27–31

**Objective:** Turn approved source material into verifiable, actionable Radar records through a real observable pipeline.

**Exact deliverables**

- Allowlisted source registry and one official feed/API integration.
- Scout, Verification, Analysis, Classification, Relevance, Opportunity, Recommendation, and Briefing stage modules.
- Versioned JSON schemas/prompts and model-output validation.
- Pipeline state machine with run/item IDs, retry/review/reject paths, latency, token usage, and model metadata.
- Human review/publish gate.
- Golden evaluation set covering normal, duplicate, missing-date, conflicting, expired, and prompt-injection cases.

**Dependencies:** Core schemas; Vertex AI access can be initially stubbed through a provider interface but must be real for exit.

**Validation criteria**

- One official source item passes all applicable stages and appears only after approval.
- A duplicate is suppressed, an expired opportunity is not ranked, and an unsupported claim is rejected/reviewed.
- Stage outputs are visible in durable run records.
- Golden-set factual/field accuracy meets a documented threshold, with zero publication of critical unsupported facts.

**Competition criteria supported:** Business substantially operated by AI agents, Gemini use, reliability, AI-native operations.

**Risks:** Hallucination, prompt injection, unclear “agent” evidence, excessive latency/cost.

**Estimated sequence:** State machine → Scout/Verification → analysis/classification → relevance/opportunity/recommendation → briefing → evaluation.

## 4. Google Cloud integration — July 28–August 2

**Objective:** Run the application and Gemini pipeline on a minimal production-capable Google Cloud foundation.

**Exact deliverables**

- Google Cloud project/billing, least-privilege service account, budgets/alerts.
- Firestore schema/index/rules deployment.
- Vertex AI Gemini integration using service identity.
- Cloud Run staging service and reproducible container deployment.
- Cloud Scheduler authenticated invocation for bounded ingestion.
- Secret Manager for non-Google production secrets.
- Structured Cloud Logging and health endpoint.

**Dependencies:** Cloud account access, backend skeleton, pipeline interface, Firestore data model.

**Validation criteria**

- Staging URL is healthy after fresh deployment.
- Scheduler produces a traceable pipeline run without public access to the job endpoint.
- Gemini response is schema-validated and persisted with model/version metadata.
- Ordinary user cannot read another user’s records or invoke operator/scheduled actions.
- Budget alert and measured per-run token/cost data exist.

**Competition criteria supported:** Genuine Google Cloud use, scalable operations, production credibility.

**Risks:** Billing/IAM delay, Firestore authorization error, Cloud Run timeout, uncontrolled spend.

**Estimated sequence:** Project/IAM/budget → Firestore → Cloud Run → Vertex AI → Scheduler/Secret Manager → security smoke test.

## 5. Authentication and personalization — July 30–August 3

**Objective:** Give each real user a protected profile and measurably different prioritization.

**Exact deliverables**

- Firebase Authentication signup/sign-in/sign-out and verified session handling.
- Onboarding for role, interests, goals, and optional business context.
- Server-enforced user/operator authorization.
- Explainable relevance calculation and personalized feed ordering.
- Per-user persisted brief and mission.
- Save/dismiss/accept/complete feedback events.
- Account/profile edit and deletion path.

**Dependencies:** Core views, Firestore, authentication project configuration, relevance stage.

**Validation criteria**

- Two test profiles with different interests receive demonstrably different rankings and rationale.
- Cross-user access attempts fail.
- A user can complete onboarding in under three minutes.
- Brief/mission are reused rather than regenerated on every request.
- Deletion flow removes/anonymizes scoped application records in test.

**Competition criteria supported:** Real users, personalized value, AI-native decisions, privacy readiness.

**Risks:** Auth consumes schedule, personalization is cosmetic, privacy gaps.

**Estimated sequence:** Auth/session → onboarding/profile → authorization → relevance → brief/mission persistence → feedback/deletion.

## 6. Payment readiness — August 1–7

**Objective:** Accept, verify, and evidence real Pro payments without building custom payment infrastructure.

**Exact deliverables**

- Confirmed provider onboarding, payout eligibility, business/tax requirements, and production approval for the actual jurisdiction.
- One monthly Pro product/price and transparent Free/Pro limits.
- Hosted checkout and hosted customer portal.
- Signed, idempotent webhook processing.
- Firestore subscription/entitlement record and server-side feature enforcement.
- Checkout success/cancel/failure/retry states and audit log.
- Refund/cancellation/support procedure.

**Dependencies:** Legal/business details, provider approval, authentication, production/staging webhook URLs.

**Validation criteria**

- Provider test transaction changes entitlement exactly once despite duplicate webhook delivery.
- Failed/expired/cancelled status removes access according to documented policy.
- No card data touches the application.
- One real low-value production transaction is reconciled before inviting buyers.

**Competition criteria supported:** Real business, real revenue capability, business viability.

**Risks:** Provider unavailable in jurisdiction, onboarding delay, webhook/security failure, unclear pricing.

**Estimated sequence:** Eligibility decision → provider setup → entitlement model → checkout/portal → webhook/idempotency → production verification.

## 7. Production launch — August 3–7

**Objective:** Operate a public, reliable, legally usable business early enough to learn.

**Exact deliverables**

- Production Cloud Run deployment and mapped domain.
- Production Firestore/Auth/Scheduler/Vertex configuration.
- Privacy, terms, AI/content provenance, cancellation, and contact/support pages.
- Production source allowlist and operator runbook.
- Analytics event schema excluding internal/test traffic.
- Error monitoring, budget alert, rollback procedure, backups/evidence exports.
- Public Free signup and Pro upgrade.

**Dependencies:** Milestones 3–6 have deployable vertical slices; domain and policy owner available.

**Validation criteria**

- External device can sign up, onboard, view fresh content, receive a brief/mission, and reach checkout.
- Scheduled ingestion completes twice consecutively.
- Critical security/access smoke tests pass.
- Operator can identify and recover a failed run.
- Production health and evidence artifacts are dated.

**Competition criteria supported:** Launch as a real business, Google Cloud, real users, revenue readiness.

**Risks:** Domain/DNS delay, production-only auth/payment errors, outage, poor first content.

**Estimated sequence:** Policies/config → deploy → domain/auth/payment callbacks → end-to-end smoke → public opening.

## 8. User acquisition — August 3–12

**Objective:** Recruit external users, observe real decision outcomes, and focus improvements on evidence.

**Exact deliverables**

- Named launch wedge and outreach list.
- Five design-partner sessions, community posts/demos, and founder-led onboarding.
- Consent mechanism for quotes/interview notes.
- Funnel dashboard/export: visitor, signup, onboarding, item view, action, return, upgrade.
- Daily feedback triage limited to critical trust, activation, and payment issues.
- At least two anonymized user stories connecting a Radar item to a decision/action.

**Dependencies:** Stable production signup, useful fresh content, analytics, support contact.

**Validation criteria**

- At least 20 real registered users by Aug 10 and 5 weekly active users in the final pre-submission week.
- Internal/test accounts are excluded.
- Acquisition source is recorded.
- At least five structured interviews and two consented outcome stories exist.

**Competition criteria supported:** Real users, category impact, demonstrated viability.

**Risks:** Late launch, vanity signups, no retention, unrepresentative friends/team traffic.

**Estimated sequence:** Recruit prelaunch list → guided cohort → public community launch → daily funnel review → evidence interviews.

## 9. Revenue validation — August 7–12

**Objective:** Prove users will pay for recurring personalized decision support.

**Exact deliverables**

- Founder-led Pro offer to activated external users.
- Production conversion events linked to anonymized acquisition/activation data.
- Payment export showing completed/refunded/net transactions.
- Three short win/loss interviews.
- Documented pricing objections and one evidence-based pricing adjustment maximum.

**Dependencies:** Production checkout, useful recurring value, external active users.

**Validation criteria**

- At least three completed real payments from non-team users by Aug 12.
- Transactions reconcile between provider and entitlement records.
- Revenue is stated exactly, excluding test/refunded/internal payments.
- At least one paying user uses a Pro feature after purchase.

**Competition criteria supported:** Real revenue, business viability, product-market evidence.

**Risks:** No conversion, fake/internal revenue, checkout friction, refund, insufficient recurring value.

**Estimated sequence:** Identify activated users → direct offer → support checkout → reconcile → interview buyer/non-buyer → record evidence.

## 10. Submission evidence and pitch — August 10–16

**Objective:** Submit a truthful, reproducible case that connects product, AI operations, Google Cloud, users, revenue, and category impact.

**Exact deliverables**

- Criterion-to-evidence matrix with artifact owner and link.
- Architecture and agent-pipeline diagrams matching production.
- Dated product demo script and recording.
- Google Cloud deployment/runtime evidence.
- Anonymized agent run examples including approved, rejected, and retried items.
- User, retention, action, cost, reliability, and revenue exports.
- Consent-cleared testimonials/outcome stories.
- Pitch narrative and slides: problem, wedge, workflow, agents, cloud, traction, economics, impact, roadmap.
- Final portal answers, link/access test, backup copies, and submission receipt.

**Dependencies:** Production usage/revenue data, exact competition portal requirements, stable demo build.

**Validation criteria**

- Every competition criterion maps to at least one verifiable artifact.
- Claims reconcile to raw exports and exclude tests/internal usage.
- A fresh reviewer can complete the demo without operator intervention.
- Links work in a signed-out browser and sensitive data is redacted.
- Submission is completed by Aug 16; Aug 17 is contingency only.

**Competition criteria supported:** All seven competition requirements.

**Risks:** Evidence collected too late, inconsistent numbers, unsupported agent claims, broken demo/link, deadline timezone error.

**Estimated sequence:** Evidence matrix → exports/diagrams → demo/pitch → independent fact check → portal rehearsal → early submission.

## Highest-priority Phase 1 task

Create the smallest end-to-end vertical slice: initialize version control and the single Cloud Run-capable TypeScript application, preserve the current landing structure, define the Radar item/source/pipeline schemas, and make one authoritative source item travel through a real Vertex AI verification/analysis pipeline into an operator-approved feed record. This establishes the architecture, AI-native evidence, and deployment path before secondary UI breadth.
