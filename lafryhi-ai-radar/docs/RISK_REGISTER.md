# Controlled Shadow Risk Register

The machine-readable authority is `release/risk-register.json`; its strict schema is in
`src/services/release-governance.ts`. Every entry records probability, impact,
detection, mitigation, rollback, owner, and status.

| ID | Category | Probability | Impact | Owner | Status | Summary |
|---|---|---:|---:|---|---|---|
| RISK-001 | Technical | Medium | High | Engineering | Mitigated | Candidate execution failure |
| RISK-002 | Editorial | Medium | High | Editorial | Mitigated | Recommendation over-escalation |
| RISK-003 | Security | Low | Critical | Security | Mitigated | Sensitive report leakage |
| RISK-004 | Operational | Medium | High | Release Engineering | Mitigated | Inconsistent operator configuration |
| RISK-005 | Evaluation | High | High | Evaluation | Open | Synthetic dataset coverage |
| RISK-006 | Governance | Medium | Critical | Governance | Mitigated | Evaluation mistaken for approval |
| RISK-007 | Cost | Medium | Medium | FinOps | Open | Request/token budget overrun |
| RISK-008 | Model drift | Medium | High | ML Engineering | Open | Provider-side behavior change |
| RISK-009 | Dataset drift | Medium | High | Evaluation | Mitigated | Historical incompatibility |
| RISK-010 | Policy drift | Medium | High | Editorial Governance | Mitigated | Silent adjusted-decision change |
| RISK-011 | Human review | Medium | High | Operations | Open | Reviewer capacity or ambiguity |

Open risks require explicit operator/reviewer acceptance immediately before a future
run. None may be treated as resolved solely because local certification passes.
