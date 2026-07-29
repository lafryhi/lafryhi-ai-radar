# LAFRYHI AI Radar — Competition Product Scope

**Status:** Phase 0 canonical scope  
**Category:** Small Business Services  
**Core promise:** Discover what matters, understand why it matters, and decide what to do next.

## Target user

The initial target is a solo developer, creator, freelancer, entrepreneur, or small-business operator who actively uses AI but cannot continuously monitor launches, platform changes, grants, programs, and competitions.

The launch wedge should be **AI-active solo operators and very small teams**. They have immediate decision needs, are reachable through founder/developer/creator communities, and can buy a low-cost individual subscription. Education and Android are profile interests, not separate products.

## Core problem

AI information is abundant but fragmented, repetitive, promotional, and difficult to trust. Small operators lose time checking many sources and still miss deadlines or fail to translate developments into a business decision.

The product transforms:

> Information → Verification → Analysis → Decision → Recommended Action

It is not a generic news reader. Its unit of value is a verified, personalized decision artifact with a practical next step.

## Value proposition

LAFRYHI AI Radar gives each user a small, prioritized set of verified AI developments and opportunities, explains business relevance, recommends what to do next, and explicitly identifies what can be ignored.

## MVP features

### 1. Authentication and profile

- Email-based account creation and sign-in.
- Interest selection from the competition-defined topics.
- Minimal profile: role, interests, goals, and optional business context.
- Profile editing and account deletion path.

### 2. AI Radar Feed

- Curated records with title, canonical source, publication date, category, summary, why it matters, recommended action, relevance score, verification/confidence state, and original link.
- Sorting/filtering by relevance, recency, category, and verification.
- Clear provenance and “generated analysis” labeling.

### 3. Opportunity Radar

- Dedicated filtered view for hackathons, grants, competitions, programs, partnerships, and business opportunities.
- Deadline, eligibility, benefit, effort, user relevance, opportunity score, and suggested next step.
- Expired opportunities are visibly marked and excluded from default ranking.

### 4. Daily Brief

- One on-demand or once-daily personalized brief.
- Top developments, best opportunity, one recommended action, and items safe to ignore.
- Persisted brief so identical content is not regenerated on every view.

### 5. AI Mission

- One active practical mission per user.
- Selection rationale, expected value, estimated effort, and explicit steps.
- User can accept, dismiss with reason, or mark complete; these signals improve future relevance.

### 6. Observable controlled agent pipeline

- Named stages with structured inputs/outputs and validation.
- Run status and stage logs accessible to an operator.
- Human review/publish gate for uncertain or high-impact records during MVP.

## Explicit non-goals before submission

- Generic AI chat assistant.
- Automated execution of external actions or applications.
- Mobile/Android apps.
- Broad LAFRYHI ecosystem, GPT Store, education products, or unrelated SaaS.
- Multi-agent microservices or fully autonomous agents.
- Team collaboration beyond a manually gated later Business plan.
- Native mobile alerts, complex recommendation ML, browser extensions, social network, or public API.
- Scraping the entire web.
- Full editorial CMS; a small operator review queue is sufficient.
- Integrating every Google Cloud service.

## Free and paid boundaries

Pricing and limits must be tested, not assumed.

| Capability | Free | Pro | Business |
|---|---|---|---|
| Radar feed | Limited recent items | Full personalized feed | Pro plus business monitoring |
| Daily brief | Short/limited frequency | Full daily personalized brief | Exportable/team-oriented brief |
| Opportunities | Basic access | Full scoring and personalization | Higher limits |
| AI Mission | Preview or trial | One active personalized mission | Multiple profiles later |
| Saved items/alerts | No or very limited | Included | Higher limits later |
| Profiles | One | One | Multiple later |

Launch only **Free and Pro** before the deadline unless real customers explicitly require Business. A credible Pro boundary is personalization plus recurring decision support, not withholding source links or basic trust information.

## Key user journeys

### New user to first value

1. Visitor understands the decision-support promise.
2. User creates an account.
3. User selects role, interests, and goals in under three minutes.
4. User sees a personalized verified feed.
5. User opens one item and understands why it matters and what to do.
6. User receives one relevant mission.

### Opportunity decision

1. User opens Opportunity Radar.
2. User filters to relevant category/effort/deadline.
3. User reviews eligibility, source, deadline, score, and next step.
4. User saves, dismisses, or converts it to the active mission.

### Daily return

1. User opens the persisted daily brief.
2. User reviews top items, one opportunity, one action, and ignored noise.
3. User acts, dismisses, or gives a lightweight relevance signal.

### Upgrade

1. Free user reaches a transparent limit or sees the value of personalization.
2. User views clear Pro benefits and price.
3. Hosted checkout completes.
4. Verified webhook grants entitlement.
5. User can manage/cancel through a hosted billing portal.

## Success metrics

### Product

- Activation: at least 60% of signed-up users complete interests and view an item.
- First value: median time from signup to first item detail under five minutes.
- Quality: at least 80% of published items have two verification signals or an authoritative primary source.
- Utility: at least 25% of weekly active users save, accept, or complete a recommended action.
- Retention: track day-1 and day-7 returning users; set targets after the first cohort rather than inventing them.

### Business

- At least 20 real registered users before August 10.
- At least 5 weekly active users in the final pre-submission week.
- At least 3 completed real paid transactions from non-team users before August 12.
- Record revenue, refunds, conversion, and acquisition channel.

These are minimum evidence targets, not claims of competition sufficiency.

### Reliability and cost

- 95% of scheduled ingestion runs complete successfully.
- Every published record retains source URL, timestamps, pipeline run ID, and model/version metadata.
- Median daily AI cost per active user is measured and bounded.
- No critical security/privacy incident.

## Final-submission evidence

- Live public production URL and working signup.
- Screen recording of onboarding, personalized feed, opportunity, brief, mission, and upgrade.
- Google Cloud console/deployment evidence and an architecture diagram.
- Agent run records showing stage inputs, outputs, verification state, latency, and model.
- Source provenance and examples of rejected/unverified content.
- Anonymized user counts, activation/retention metrics, and acquisition channels.
- Payment-provider dashboard/export showing real completed payments and net revenue.
- Customer quotes or interview notes with consent.
- Versioned release notes and dated production changes.
- Cost and reliability dashboard or export.
- Clear explanation of Small Business Services impact and how AI performs substantial operations.

## Scope acceptance rule

A feature enters the pre-deadline MVP only if it directly improves one of: trustworthy discovery, personalized prioritization, actionable recommendation, real-user conversion, payment, Google Cloud evidence, or submission evidence. Otherwise it remains out of scope.

