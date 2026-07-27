# Phase 5 Ownership Matrix

## Status

- Status: Approved for Phase 5.1 governance
- Approval date: 2026-07-27
- Model: Role-based ownership; no individual identities are fabricated
- Independent reviewer: Not currently assigned

One project owner may hold multiple roles, but each responsibility remains logically separated. A role acting in two capacities must record both capacities in the decision evidence.

## RACI definitions

- **A — Accountable:** Owns the final decision and accepts its documented risk.
- **R — Responsible:** Produces the work and validation evidence.
- **C — Consulted:** Must review before the decision.
- **I — Informed:** Receives the decision and operational effect.
- **—:** No standing responsibility.

Roles:

- Product and Editorial Owner (`PE`)
- Architecture Owner (`AR`)
- Security and Privacy Owner (`SP`)
- Data Governance Owner (`DG`)
- Reliability Owner (`RL`)
- Operations Owner (`OP`)
- Evaluation Owner (`EV`)

## Matrix

| Responsibility | PE | AR | SP | DG | RL | OP | EV |
|---|---:|---:|---:|---:|---:|---:|---:|
| Architecture decisions | C | A/R | C | C | C | I | C |
| Publisher trust | A/R | C | C | C | I | I | C |
| Source reputation | A | C | C | R | I | I | R |
| Source registration | A/R | C | C | C | I | R | I |
| Normalization rules | C | A/R | C | C | C | I | R |
| Canonical URL rules | C | A/R | C | C | C | I | R |
| Fingerprinting | I | A/R | C | C | C | I | R |
| Duplicate detection | C | A | C | C | C | I | R |
| Language support | A | C | C | C | I | I | R |
| Provenance | I | A/R | C | R | C | I | C |
| Privacy | I | C | A/R | C | C | C | C |
| Telemetry | I | C | A | C | C | R | C |
| Evaluation corpus | C | C | C | A | C | I | R |
| Threshold approval | A | C | C | C | C | C | R |
| Risk acceptance | C | A | C | C | C | C | C |
| Feature flags | I | C | C | I | C | A/R | I |
| Shadow operation | C | C | C | I | R | A | R |
| Production deployment | I | C | C | I | C | A/R | I |
| Rollback | I | C | C | I | R | A | C |
| Operator corrections | A/R | C | C | C | I | I | C |
| Editorial policy | A/R | C | C | C | I | I | C |
| Publication authority | A/R | I | C | I | I | R | I |
| Incident response | I | C | C | I | R | A/R | C |

## Mandatory authority boundaries

### Publisher trust

Publisher trust is operator-controlled under the Product and Editorial Owner. Analytically derived observations cannot register, enable, disable, suspend, or change a publisher.

### Source reputation

Source reputation is analytically derived, decomposed, sample-aware, and advisory. It is governed by Data Governance and Evaluation and cannot become authorization.

### Publication authority

Phase 5 has no publication authority. Only an explicit authenticated operator decision through the existing Phase 4 workflow may approve, and only the existing atomic publication transaction may publish.

### Production authorization

Production deployment, feature activation, Firestore writes, and traffic changes require separate Operations authorization and the applicable release gate. Documentation adoption, ADR acceptance, or implementation completion is insufficient.

## Decision separation

When one person holds several roles:

1. The record identifies the role used for each decision.
2. Security/privacy review is recorded separately from architecture authorship.
3. Threshold approval is recorded separately from algorithm implementation.
4. Risk acceptance identifies the accountable role and supporting reviewers.
5. Production authorization remains separate from implementation authorization.

## Independent review limitation

No independent reviewer is currently assigned.

- **Non-blocking for Phase 5.1:** deterministic offline contract code, pure normalization, canonicalization, fingerprinting, artifact envelopes, provenance structures, and corpus harness work.
- **Blocking before:** production writes, model calls, production telemetry, operator-facing behavior, feature activation, deployment, schema changes, or security-boundary changes.

## Ownership acceptance

The role assignments above are sufficient for the limited offline Phase 5.1 scope. They do not satisfy future milestone review requirements automatically.
