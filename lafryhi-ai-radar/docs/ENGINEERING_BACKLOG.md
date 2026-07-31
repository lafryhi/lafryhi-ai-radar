# Engineering Backlog

This is a lightweight, review-oriented backlog for production hardening. Items are intentionally small and should be delivered as one logical change per commit. Cloud, security, or production-affecting work requires explicit approval before execution.

## High priority

| ID | Improvement | Why it matters | Impact | Approval |
|---|---|---|---|---|
| H-01 | Add Cloud Scheduler failure alerting and a production uptime check | Scheduled RSS discovery can fail silently without an alert | Faster detection of ingestion outages; no application behavior change | Required before cloud changes |
| H-02 | Enable Firestore delete protection, PITR, and scheduled backups | Current data recovery controls are incomplete | Protects editorial history and enables tested recovery | Required before cloud changes |
| H-03 | Replace the Cloud Build Compute Editor identity with a least-privilege build identity | A compromised build currently has excessive project permissions | Reduces supply-chain blast radius | Required before IAM changes |
| H-04 | Enable Artifact Registry vulnerability scanning and define release gates | Current production images are not automatically scanned | Prevents known vulnerable images from reaching release | Required before API/policy changes |

## Medium priority

| ID | Improvement | Why it matters | Impact | Approval |
|---|---|---|---|---|
| M-01 | Add structured Cloud Run, Vertex, Firestore, and Scheduler log-based metrics | Current operational signals are difficult to trend | Better diagnosis and capacity planning | Required before monitoring changes |
| M-02 | Add CI validation on the protected production branch | Builds are currently manually submitted | Improves reproducibility and prevents untested releases | Required before CI changes |
| M-03 | Pin the Docker base image by digest | Tag-based rebuilds are not fully reproducible | More deterministic supply chain | Review before build change |
| M-04 | Define Secret Manager rotation and superseded-version retirement procedures | Multiple secret versions can remain enabled | Reduces credential lifetime and rotation ambiguity | Review before secret changes |

## Low priority

| ID | Improvement | Why it matters | Impact |
|---|---|---|---|
| L-01 | Add cost-allocation labels and billing-export documentation | Cost attribution is currently limited | Improves spend visibility |
| L-02 | Review and retire unused Google Cloud APIs after usage confirmation | Broad API enablement increases administrative surface | Cleaner project inventory |
| L-03 | Add a documented rollback drill using the previous immutable image | Rollback exists operationally but is not rehearsed regularly | Lower recovery time during incidents |

## Technical debt

- TD-01: Consolidate remaining runtime diagnostics and error classification conventions.
- TD-02: Review local migration artifacts and separate historical evaluation fixtures from active runtime assets.
- TD-03: Add explicit ownership metadata to release and operational documents.
- TD-04: Review dependency and base-image update cadence without changing production versions implicitly.

## Future ideas

- F-01: Add a staged Cloud Run rollout with an automated rollback gate.
- F-02: Add a second-region recovery strategy after data and traffic requirements are known.
- F-03: Add workload-level Vertex token budgets and anomaly detection.
- F-04: Evaluate private service separation for operator and scheduled ingestion routes.

## Recommended next task

H-01 should come next: Scheduler is business-critical, the authentication incident demonstrated the detection gap, and an alert plus uptime check provides high reliability value with limited scope. It requires explicit approval because it changes Google Cloud monitoring resources.

