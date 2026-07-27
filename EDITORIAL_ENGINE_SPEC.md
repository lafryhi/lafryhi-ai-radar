# Phase 5 Editorial Engine Specification

## Status

Proposed architecture only. The Editorial Engine is advisory. It cannot approve, reject, publish, alter review decisions, or replace the existing atomic publication transaction.

## Purpose

The Editorial Engine turns grounded Story Versions into transparent recommendations: what deserves attention, why it matters, whether it may be breaking, how a topic is changing, and what belongs in a digest or weekly report.

## Editorial principles

- Human editorial judgment remains authoritative.
- A score is a versioned policy output, not an objective fact.
- Every score exposes its component signals and exclusions.
- Every generated statement links to accepted evidence.
- Confidence, coverage, importance, urgency, and novelty are distinct.
- Source volume is discounted for syndication and common ownership.
- Conflicts are surfaced, not averaged away.
- Suppression changes presentation only and is reversible.
- No editorial result can transition review or publication state.

## Editorial Assessment

An Editorial Assessment is attached to one immutable Story Version and contains:

- assessment ID and policy version;
- component signal values;
- normalized weights;
- missing-signal treatment;
- importance score;
- urgency score;
- novelty score reference;
- confidence and coverage references;
- editorial-priority score and band;
- breaking-news eligibility and expiry;
- inclusion/exclusion recommendations for products;
- explanation codes;
- created-at logical time and supersedes reference.

## Scoring scale and policy

All component signals are represented on `[0, 1]` with explicit unknown states. Unknown is not coerced to zero. A policy version defines weights, minimum required signals, caps, and interaction rules. Scores are calculated deterministically from a fixed Story Version.

### Scoring signals

| Signal | What it measures | Typical inputs | Guardrails |
|---|---|---|---|
| Public impact | Estimated breadth and depth of consequences | affected population/sectors, geographic scope | Never infer protected demographic value; show uncertainty |
| Strategic relevance | Fit with AI Radar's documented editorial mission | topic taxonomy, policy priorities | Policy-owned and versioned; not model-invented |
| Novelty | New grounded information relative to prior coverage | new claims/entities/status changes | Use fixed prior snapshot; discount copies |
| Urgency | Time sensitivity of operator action | event recency, deadlines, rapid change | Decays predictably; not equivalent to importance |
| Evidence confidence | Reliability of extracted grounded claims | calibrated Analysis Intelligence confidence | Cannot override invalid evidence |
| Coverage completeness | Breadth of known aspects | coverage estimate, unresolved questions | Kept separate from confidence |
| Independent corroboration | Support from plausibly independent origins | source clusters, claim comparisons | Syndicated copies count once |
| Contradiction severity | Material unresolved disagreement | contradiction types and scope | May raise review priority while lowering synthesis confidence |
| Authority relevance | Directness of relevant primary/official source | source role and claim provenance | Authority can still be wrong; never sole truth criterion |
| Geographic relevance | Fit with configured audience region | grounded location and policy | Explicit policy, not hidden personalization |
| Persistence | Likelihood the topic matters beyond a short spike | lifecycle history, repeated material updates | Avoid popularity-only reinforcement |
| Editorial effort | Estimated work to reach publishable understanding | missing fields, conflicts, language needs | Used for planning, not to bury difficult stories |
| Source diversity | Breadth of independent viewpoints/origins | cluster-adjusted publisher mix | Diversity definition is policy-controlled |
| Risk sensitivity | Potential harm from error or premature framing | event domain and uncertainty | Raises review rigor; does not automatically suppress |

## Importance scoring

Importance represents durable editorial significance. Proposed structure:

```text
importance =
  weighted(public impact,
           strategic relevance,
           geographic relevance,
           persistence,
           authority relevance,
           source diversity)
```

The policy must:

- publish weights and version;
- require minimum confidence for a precise numeric display;
- cap authority relevance so one publisher cannot dominate;
- distinguish observed impact from projected impact;
- represent insufficient information explicitly.

Importance does not include raw recency; a durable story may remain important after urgency decays.

## Editorial priority

Editorial priority recommends operator attention at a given logical time:

```text
priority =
  importance
  × confidence-aware readiness
  + urgency contribution
  + novelty contribution
  + contradiction-review contribution
  - duplication contribution
  - unresolved-risk penalty
```

This is a conceptual relationship, not accepted weights. Important rules:

- a contradiction may increase review priority without increasing publishability;
- low coverage can raise research priority while lowering synthesis readiness;
- exact/near duplicates reduce repeated queue impressions, not source retention;
- missing values use documented policy, never invented defaults;
- priority bands have deterministic thresholds and stable tie-breaking.

## Story ranking

Ranking selects a policy/version, evaluation cutoff, eligible Story Versions, and stable tie-breaker. It produces:

- ordered Story IDs;
- total priority and component breakdown;
- exclusion/suppression reasons;
- assessment version;
- unchanged baseline review status.

Operators can choose supported policy views, but policy selection is authorized configuration, not free-form model prompting.

## Breaking-news logic

Breaking-news status is a bounded, expiring advisory signal.

### Eligibility signals

- material event occurred or changed recently;
- high novelty relative to the last accepted Story Version;
- sufficiently direct grounded evidence;
- public impact or strategic relevance above policy threshold;
- update velocity above a versioned threshold;
- independent corroboration, or a clearly labeled credible single-source condition;
- no unresolved integrity failure.

### Exclusions

- copied coverage without new material information;
- scheduled events already represented without change;
- only a model-inferred prediction;
- invalid or missing evidence;
- expired update window;
- corrections that negate the breaking claim, except as a breaking correction.

Breaking status has `eligible_at`, `expires_at`, reason codes, and a recalculation version. It cannot automatically publish or send an external alert without a separate accepted decision.

## AI Radar summaries

An AI Radar summary is a concise, evidence-grounded representation of one Story Version. It must:

- state only supported claims;
- distinguish confirmed, reported, disputed, and unknown;
- include the material change from the prior version;
- disclose unresolved contradictions;
- avoid reconstructing quotes;
- link sentences or structured clauses to accepted evidence;
- pass schema, evidence, duplicate-integrity, and editorial-policy validation;
- be generated as a complete replacement object.

Summary generation has a separately approved model budget and does not reuse the Phase 4 recovery ceiling.

## Digest generation

A digest is assembled from accepted Editorial Assessments and validated summaries:

1. select eligible Story Versions at a fixed cutoff;
2. apply policy ranking and diversity constraints;
3. collapse only view-level duplicates;
4. retain material contradictions and updates;
5. generate structured sections from grounded summaries;
6. validate all references and evidence;
7. present a draft for explicit human review.

A digest draft is not a publication and cannot enter the existing publication transaction without a future, separately approved product contract.

## Weekly report generation

The weekly report covers a fixed interval and includes:

- highest-impact Story Versions;
- new Stories;
- material lifecycle changes;
- resolved and unresolved contradictions;
- topic trends;
- source coverage and diversity;
- corrections/retractions;
- methodology and cutoff.

It avoids double-counting story versions and labels late-arriving information. Comparative claims use compatible snapshots. Every narrative section has traceable supporting Story Versions.

## Topic evolution

A Topic is a policy-defined taxonomy node or a versioned discovered cluster. Topic evolution tracks:

- active Story count;
- new and closing Stories;
- grounded claim and entity changes;
- novelty velocity;
- source and geographic diversity;
- contradiction patterns;
- editorial attention over time.

Taxonomy changes create a new mapping version. Discovered clusters remain proposals until governed. Topic trends do not imply public sentiment unless a separately validated signal supports that claim.

## Long-running stories

Long-running Stories require:

- stable Story identity and version lineage;
- milestone Events;
- current known state;
- open questions;
- contradiction history;
- corrections;
- source-coverage changes;
- dormant/reactivation rules.

The engine distinguishes a substantive update from repetitive coverage and preserves an auditable timeline of membership changes.

## Story lifecycle

### Proposed states

| State | Meaning |
|---|---|
| proposed | Candidate grouping lacks activation evidence |
| emerging | Grounded initial event with limited coverage |
| developing | Material updates continue |
| established | Identity and central event are stable |
| disputed | A material unresolved contradiction affects the central account |
| dormant | No material update within the policy window |
| reactivated | New material information follows dormancy |
| closed | Editorially concluded for active tracking |
| superseded | Replaced by an explicit split/merge lineage decision |

`breaking` is an expiring signal, not a lifecycle state.

### Transition rules

- Transitions use a fixed Story Version and policy version.
- Automatic proposals may be made, but operator-controlled transitions are available for policy-sensitive states.
- Disputed status cannot be hidden by ranking.
- Dormancy uses logical time and event-type-specific windows.
- Closure does not delete or prevent later reactivation.
- Split/merge transitions preserve lineage.

## Duplicate-story suppression

A Story Version may be suppressed from a ranked view only when it is confidently represented by another visible Story and adds no material novelty. The assessment records:

- canonical visible Story;
- suppression reason;
- similarity and novelty components;
- conflict check outcome;
- policy version;
- operator reversal.

Source coverage remains accessible. Corrections, contradictions, new source origins, and material updates defeat suppression.

## Generated-product validation

Before an editorial draft is visible:

- validate complete schema;
- verify every evidence reference;
- enforce exact quote behavior where quotes are present;
- validate claim-to-story provenance;
- check duplicate and contradiction integrity;
- enforce product length without semantic truncation;
- verify cutoff and lifecycle consistency;
- run privacy and prohibited-content policy;
- record prompt/model/schema/policy versions.

Invalid drafts fail safely and do not alter their source Story or review records.

## Operator feedback

Operators may provide explicit labels such as:

- ranking too high/low;
- incorrect Story membership;
- missed novelty;
- false contradiction;
- lifecycle correction;
- summary issue;
- policy exception.

Feedback is append-only, attributed, and separated from production truth. It feeds labeled evaluation only after governance review; it does not silently retrain or change weights.

## Fairness and policy governance

- Editorial mission and geography weights are documented.
- Source reputation and publisher size cannot become hidden exclusion rules.
- Minority or local sources are protected from volume-based suppression.
- Disagreement with high-reputation sources is still visible.
- Policy changes require review, versioning, offline comparison, and rollback.

## Acceptance evaluation

- Labeled ranking comparisons with inter-editor disagreement.
- Breaking-news precision, expiry, and false-alert tests.
- Duplicate suppression false-positive tests.
- Long-running Story split/merge/reactivation scenarios.
- Digest and weekly-report factuality with zero unsupported claims in the acceptance corpus.
- Score explanation completeness.
- Deterministic repeated runs at fixed cutoff.
- Confirmation that no output can approve or publish.

## Open questions

1. Who owns editorial policy weights and approval?
2. Which operator views may use ranking versus display it in shadow?
3. What precision is required before breaking-news signals leave shadow mode?
4. Are digests internal-only in Phase 5, or candidates for a later publication product?
5. How should inter-editor disagreement inform acceptance thresholds?
6. Which topics and geographic priorities define the first policy version?
