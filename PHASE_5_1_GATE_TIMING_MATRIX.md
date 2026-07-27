# Phase 5.1 Gate Timing Matrix

## Status

- Status: Approved
- Approval date: 2026-07-27
- Scope: Deterministic offline 5.1A and 5.1B

The timing classes prevent implementation outputs from being demanded before implementation and prevent foundational governance from being deferred.

## Timing classes

- **BEFORE_IMPLEMENTATION:** Must exist before 5.1A begins.
- **DURING_5_1A:** Produced while implementing pure contracts; blocks entry to 5.1B.
- **DURING_5_1B:** Produced while implementing deterministic utilities/harness.
- **BEFORE_MILESTONE_COMPLETION:** Must pass before Phase 5.1 is complete.
- **BEFORE_SHADOW:** Required before any future production-data shadow computation.
- **BEFORE_PRODUCTION:** Required before any production activation/deployment.
- **NOT_APPLICABLE:** Not required for the offline milestone.

## Matrix

| Requirement ID | Requirement | Timing class | Rationale | Evidence required | Current state | Blocks implementation entry |
|---|---|---|---|---|---|---|
| TIME-CORP-001 | Corpus composition approval | BEFORE_IMPLEMENTATION | Scope/effort and qualification categories must be known | Approved `p5-corpus-v0-planned` composition | SATISFIED | Yes, satisfied |
| TIME-CORP-002 | Actual corpus creation | DURING_5_1B | Harness and governed fixture tooling must exist first | Manifested fixtures with provenance/license/privacy | NOT STARTED | No |
| TIME-CORP-003 | Initial labeled development samples | DURING_5_1B | 5.1A uses small synthetic contract fixtures, not corpus samples | Reviewed governed synthetic development fixtures | NOT STARTED | No |
| TIME-CORP-004 | Full minimum corpus completion | BEFORE_MILESTONE_COMPLETION | Required for threshold claims, not for writing pure code | 240 documents and 385 relationship units | NOT STARTED | No |
| TIME-ISO-001 | Pure module-boundary design | BEFORE_IMPLEMENTATION | Prevent accidental production dependency | Isolation evidence document | SATISFIED_WITH_LIMITATION | Yes, satisfied |
| TIME-ISO-002 | Import-boundary enforcement test | DURING_5_1A | Requires actual module paths/imports | Static import/capability test | SATISFIED | No; 5.1B authorized |
| TIME-LAT-001 | Provisional latency budget | BEFORE_IMPLEMENTATION | Prevent unbounded design | Approved reference budgets | SATISFIED | Yes, satisfied |
| TIME-LAT-002 | Measured implementation latency | DURING_5_1B | Algorithms must exist | Five benchmark runs per approved policy | NOT STARTED | No |
| TIME-LAT-003 | Corpus-run latency pass | BEFORE_MILESTONE_COMPLETION | Qualification must remain usable | Five complete runs within ceiling | NOT STARTED | No |
| TIME-COST-001 | Provisional compute ceiling | BEFORE_IMPLEMENTATION | Bound offline resource use | Duration/disk/log/memory/CI ceilings | SATISFIED | Yes, satisfied |
| TIME-COST-002 | Measured implementation compute use | DURING_5_1B | Requires harness and utilities | Artifact sizes, logs, peak RSS, CI time | NOT STARTED | No |
| TIME-PRIV-001 | Offline privacy contract | BEFORE_IMPLEMENTATION | Diagnostics/fixtures need rules first | Approved privacy contract | SATISFIED | Yes, satisfied |
| TIME-PRIV-002 | Offline privacy enforcement tests | DURING_5_1A and 5.1B | Contract errors tested in 5.1A; harness diagnostics require 5.1B tests | Safe-error and future allowlist/denylist tests | SATISFIED_FOR_5_1A | No; 5.1B must extend |
| TIME-PRIV-003 | Production telemetry review | BEFORE_PRODUCTION | No production telemetry exists in scope | Independent privacy/security review | DEFERRED | No |
| TIME-REV-001 | Independent reviewer for offline work | BEFORE_MILESTONE_COMPLETION | Improves confidence before completion claim | Named/role review record or explicit renewed exception | NOT ASSIGNED | No |
| TIME-REV-002 | Independent reviewer for production/model/operator work | BEFORE_SHADOW | Higher-risk boundary requires independence | Independent review record | DEFERRED | No |
| TIME-MODEL-001 | Model budget/provider contract | BEFORE_SHADOW | Models are excluded from 5.1 | Accepted model ADR and budget | NOT APPLICABLE | No |
| TIME-FS-001 | Firestore schema | BEFORE_SHADOW if persistence is proposed | Offline 5.1 writes nothing | Separate accepted ADR/schema review | NOT APPLICABLE | No |
| TIME-FLAG-001 | Feature-flag plan | BEFORE_SHADOW | No production consumer exists | Separate rollback/activation design | DEFERRED | No |
| TIME-DEPLOY-001 | Deployment plan | BEFORE_PRODUCTION | Documentation/implementation is not deployment authority | Release plan and canary protocol | DEFERRED | No |
| TIME-PROD-001 | Production authorization | BEFORE_PRODUCTION | Operations authority is separate | Explicit release gate | DEFERRED | No |
| TIME-RISK-001 | Eight entry-risk timing classifications | BEFORE_IMPLEMENTATION and sub-slice gate | Risks cannot remain ambiguously blocking | Risk resolution and implementation report | SATISFIED_WITH_LIMITATION | 5.1A complete; 5.1B risks explicit |
| TIME-P4-001 | Baseline compatibility contracts | BEFORE_IMPLEMENTATION | Phase 4 is frozen | Approved contracts and current validation baseline | SATISFIED | Yes, satisfied |
| TIME-P4-002 | Added compatibility tests | DURING_5_1A | Tests require module interfaces | Full compatibility/import/capability suite | SATISFIED | No; Phase 4 regression 209/209 |

## Gate interpretation

Phase 5.1A requirements are satisfied. Missing normalization, fingerprint, corpus, performance, and resource artifacts are scheduled during 5.1B or before completion. Production requirements remain deferred and cannot be inferred from 5.1B readiness.
