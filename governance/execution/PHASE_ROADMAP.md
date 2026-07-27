# Permanent Phase Roadmap

This is a navigation and execution summary. Existing phase documents remain authoritative for scope, sequencing, and acceptance details.

## Program history and active plan

| Phase | Status | Dependencies / entry criteria | Exit criteria | Expected deliverables |
|---|---|---|---|---|
| Phase 0 — audit and planning | Complete historical foundation | Repository inventory and product scope | Architecture, risks, roadmap, and priorities recorded | Baseline audit, product scope, architecture, risk register, execution roadmap |
| Phase 1 — core implementation | Complete | Phase 0 decisions | Application, strict domain boundaries, human review gate, tests, and documentation | Next.js service, repository adapters, Gemini analysis boundary, review/publication flow |
| Phase 2 — cloud and real evidence | Complete historical work | Phase 1 implementation and configured cloud environment | Evidence-backed cloud execution and safety records | Cloud setup and execution evidence |
| Phase 3 — AI pipeline evolution | Incorporated into later baseline | Phase 1/2 pipeline | Evidence-bounded analysis behavior established | Pipeline and validation evolution reflected in later reports |
| Phase 4 — governed production baseline | Complete and frozen | Prior application/cloud capabilities; operator and recovery requirements | Phase 4 gates pass; release baseline tagged | Operator dashboard; lossless and bounded recovery; evidence hardening; atomic readiness/publication; release evidence |
| Phase 5.0 — contracts and evaluation foundation | Governance adopted; foundation work incorporated into 5.1A | Frozen Phase 4 baseline; accepted entry governance | Applicable contracts, ownership, ADRs, corpus rules, and harness boundary accepted | Compatibility, artifact, provenance, telemetry, evaluation, risk, and rollback contracts |
| Phase 5.1 — Source Intelligence | Active; 5.1A/5.1B complete, milestone qualification pending | Phase 5.0 authority; approved 5.1 scope; accepted ADRs; entry gate | Every completion-blocking threshold passes on approved corpus; compatibility/privacy/isolation evidence passes; limitations recorded | Deterministic source normalization and fingerprinting, duplicate/source observations, corpus/harness, provenance, milestone report |
| Phase 5.2 — Analysis Intelligence | Planned; not authorized | Explicit authorization; stable Phase 5 contracts; qualified required Source Intelligence inputs | Grounding, identity, temporal, contradiction, story, novelty, coverage, confidence, privacy, and regression gates pass | Claims, events, entities, timelines, comparisons, Stories, versions, graph and advisory views |
| Phase 5.3 — Editorial Intelligence | Planned; not authorized | Stable 5.2 contracts and 5.1 source observations; accepted editorial policy | Advisory evaluation passes; explanations and fixed-cutoff determinism pass; no automatic publication | Ranking, priority/breaking assessment, lifecycle, summaries, digests, weekly reports |
| Phase 5.4 — Operational Intelligence | Planned; not authorized | Stable domain contracts and operational-event foundation | Reconciliation, completeness, privacy, accuracy, and operational acceptance gates pass | Projections, dashboards, trends, alerts, runbooks, cost/capacity visibility |
| Phase 5.5 — Reliability Evolution | Planned; not authorized | Stable contracts from exercised milestones and explicit test authority | Replay, canary, fault, load/soak, performance, capacity, recovery, and controlled-release gates pass | Simulator, synthetic canaries, fault injection, performance evidence, capacity/DR design, release decision |

## Dependency chain

Phase 4 frozen baseline → Phase 5.0 contracts → Phase 5.1 and Phase 5.2 foundations → Phase 5.3 advisory behavior. Phase 5.4 and 5.5 foundations may proceed only where [`PHASE_5_IMPLEMENTATION_ORDER.md`](../../PHASE_5_IMPLEMENTATION_ORDER.md) permits, but they cannot validate an unstable upstream capability.

## Entry rules

A phase may start only when:

- the user names the bounded phase or otherwise explicitly authorizes it;
- its controlling scope and accepted decisions exist;
- every mandatory predecessor and entry gate passes;
- baseline validation and repository state are known;
- unresolved questions are either closed or formally classified as non-blocking outside the slice;
- rollback, privacy, compatibility, and evidence requirements are defined; and
- production effects, if any, are separately authorized.

## Exit rules

A phase exits only when:

- all in-scope deliverables exist;
- focused and full validation pass;
- milestone-specific thresholds and regressions pass;
- the diff and dependency boundaries are audited;
- evidence and limitations are documented;
- [PROJECT_STATE.md](PROJECT_STATE.md) is updated;
- the requested commit is created; and
- the final report does not overstate implementation, qualification, review, or production status.

## Authoritative references

- Historical sequence and product delivery: [`GEMINI_XPRIZE_EXECUTION_ROADMAP.md`](../../GEMINI_XPRIZE_EXECUTION_ROADMAP.md)
- Phase 4 records: root `GEMINI_XPRIZE_PHASE4_*.md`, [`PHASE_4_2_1_EVIDENCE_HARDENING.md`](../../PHASE_4_2_1_EVIDENCE_HARDENING.md), and [`RELEASE_NOTES_v1.0_RC1.md`](../../RELEASE_NOTES_v1.0_RC1.md)
- Phase 5 document map: [`PHASE_5_BLUEPRINT_INDEX.md`](../../PHASE_5_BLUEPRINT_INDEX.md)
- Phase 5 milestones: [`PHASE_5_ROADMAP.md`](../../PHASE_5_ROADMAP.md)
- Risk-minimized steps: [`PHASE_5_IMPLEMENTATION_ORDER.md`](../../PHASE_5_IMPLEMENTATION_ORDER.md)
