# LAFRYHI AI Radar — Competition Risk Register

**Review cadence:** Daily until production launch; every two days afterward  
**Status values:** Open, Mitigating, Accepted, Closed  
**Owner key:** Product Owner (scope/business), Engineering (implementation/operations), AI Quality (sources/model evaluation), Growth (users/revenue), Submission Lead (evidence). One person may hold multiple roles, but every role must be explicitly assigned.

| ID | Risk | Probability | Impact | Mitigation | Trigger | Owner | Status |
|---|---|---:|---:|---|---|---|---|
| R01 | Insufficient time before August 17 | High | Critical | Freeze scope to Free + Pro core journeys; daily critical-path review; deploy thin vertical slice first; reserve final five days for evidence and reliability. | Any critical milestone slips by >1 day or no production deployment by Aug 3. | Product Owner | Open |
| R02 | Overbuilding | High | Critical | Enforce scope acceptance rule; no mobile app, generic chat, automation, microservices, or Business features without paying-user evidence. | A proposed task does not directly support MVP value, users, revenue, Google Cloud, or evidence. | Product Owner | Mitigating |
| R03 | Unreliable information sources | High | High | Small allowlist; prefer official APIs/RSS/primary sources; canonical URLs, retrieval timestamps, hashes, retry/review queue. | Source failures exceed 10% in a day or conflicting facts appear. | AI Quality | Open |
| R04 | Hallucinated analysis or recommendations | High | Critical | Evidence-bounded prompts, structured schemas, fact/interpretation separation, confidence thresholds, human review, golden-set evaluation. | Generated claim cannot be traced to supplied evidence or evaluation precision drops below target. | AI Quality | Open |
| R05 | Lack of real users | High | Critical | Recruit design partners immediately; instrument funnel; publish useful public samples; conduct direct outreach and interviews; track consented evidence. | Fewer than 10 registered external users by Aug 5 or fewer than 20 by Aug 10. | Growth | Open |
| R06 | Lack of real revenue | High | Critical | Confirm payment provider in first week; launch Pro early; conduct founder-led sales; use clear paid boundary; test checkout with real external customer. | Provider not approved by Aug 2, no live checkout by Aug 7, or no payment by Aug 10. | Growth | Open |
| R07 | Google Cloud integration delays | Medium | Critical | Create project/billing/IAM immediately; deploy hello-world service early; use one Cloud Run service and managed products; avoid optional services. | Billing/IAM blocked >24 hours or staging deploy absent by Jul 29. | Engineering | Open |
| R08 | Payment provider availability/onboarding | High | Critical | Verify legal entity, country support, payout, tax, and onboarding before SDK work; keep provider adapter/webhook narrow; prepare compliant alternative invoice/checkout route. | Provider rejects entity, requires unavailable documents, or payout is unsupported. | Product Owner | Open |
| R09 | Authentication complexity | Medium | High | Use Firebase Authentication; one primary sign-in method; server-side token verification; defer social-provider matrix and teams. | Auth consumes >2 engineering days or account recovery blocks testers. | Engineering | Open |
| R10 | Privacy/data protection failure | Medium | Critical | Data minimization, consent timestamps, privacy/terms, deletion flow, least privilege, no sensitive prompts/logs, documented retention. | External users are invited before policies/deletion exist or personal data appears in logs. | Product Owner | Open |
| R11 | Excessive AI cost | Medium | High | Deduplicate before inference; persist outputs; batch caps; quotas; model routing; token/cost logs and budget alerts. | Daily AI spend exceeds budget or per-active-user cost exceeds viable Pro margin. | Engineering | Open |
| R12 | Weak differentiation from AI news | High | High | Ship verified provenance, personalized relevance, opportunity scoring, ignore guidance, and one actionable mission; test messaging with users. | Users describe product mainly as “AI news” or action engagement is under 10%. | Product Owner | Open |
| R13 | Submission evidence gaps | Medium | Critical | Define evidence checklist now; durable pipeline run records; weekly exports/screenshots; consented testimonials; assign owner and rehearse demo. | A competition criterion lacks an artifact at weekly review or portal requirements remain unknown by Aug 1. | Submission Lead | Open |
| R14 | Dependency/build/deployment failure | Medium | High | Minimal dependencies, lockfile, pinned runtime, CI validation, staging smoke test, rollbackable releases, health check. | Unreproducible local build, critical advisory, or failed production deploy. | Engineering | Open |
| R15 | No version-control baseline | High | High | Initialize Git before implementation, add ignore rules, create intentional baseline commit, protect secrets, use small changes. | Any Phase 1 code begins without Git history. | Engineering | Open |
| R16 | Source licensing/terms violation | Medium | Critical | Review source terms; prefer feeds/APIs; store metadata and derived summaries rather than full text; honor removal requests. | Source prohibits use, sends complaint, or raw copyrighted content is persisted without basis. | Product Owner | Open |
| R17 | Prompt injection from source content | High | High | Treat fetched content as data; delimiter isolation, tool prohibition, schema validation, URL allowlist, no autonomous actions. | Source text changes agent behavior, attempts secret access, or produces out-of-schema output. | AI Quality | Open |
| R18 | Incorrect or expired opportunity details | High | Critical | Canonical organizer source, timezone-normalized deadline, scheduled expiry, human review for eligibility/reward, visible retrieval time. | User reports a wrong deadline/eligibility or expired item remains ranked. | AI Quality | Open |
| R19 | Agent pipeline is only marketing language | Medium | Critical | Persist each stage’s status/input references/output/version/latency; demonstrate rejects/retries and operator review; avoid fake autonomy claims. | A demo cannot show a real candidate passing through named stages. | Engineering | Open |
| R20 | Production outage or lost data | Medium | High | Managed Firestore, health checks, error alerts, idempotent ingestion/webhooks, export critical evidence, documented rollback. | Error rate >5%, scheduler misses two runs, or webhook processing fails. | Engineering | Open |
| R21 | Low recommendation quality/personalization | High | High | Keep profile concise, expose score reasons, collect dismiss/save/complete feedback, evaluate by segment, use rule/model hybrid. | Most users see the same feed or useful-action rate stays below 25%. | AI Quality | Open |
| R22 | Operator workload is unsustainable | Medium | High | Small source set, confidence thresholds, deduplication, prioritized review queue, measure review minutes/item. | Review backlog exceeds one day or >20 minutes per published item. | Product Owner | Open |
| R23 | Analytics cannot prove real usage | Medium | Critical | Define event schema before launch; distinguish team/test accounts; store privacy-safe funnel events and dated exports. | Counts cannot exclude internal/test traffic or activation/retention cannot be computed. | Submission Lead | Open |
| R24 | Pricing/plan complexity blocks launch | Medium | High | Launch one monthly Pro SKU; defer Business and annual plans; transparent limits; hosted portal. | Pricing decisions delay checkout >1 day or entitlement branches multiply. | Product Owner | Open |

## Immediate red-risk actions

1. Assign named people to the owner roles.
2. Confirm Google Cloud billing/IAM and payment-provider eligibility.
3. Initialize version control before Phase 1 implementation.
4. Obtain exact submission evidence requirements.
5. Recruit the first five design partners before the full MVP is complete.

