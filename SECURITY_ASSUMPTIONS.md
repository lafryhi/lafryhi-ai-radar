# LAFRYHI AI Radar Security Assumptions

These assumptions define the v1.0.0-rc1 security model. They are operational
constraints to monitor, not guarantees that remove the need for validation,
least privilege, incident response, or human review.

| Assumption | Enforcement mechanism | Failure impact | Monitoring or mitigation |
|---|---|---|---|
| The operator is a trusted decision-maker using an authenticated workflow. | Private Cloud Run invocation plus the existing operator-token guard; operator actions are server-side and logged. | Unauthorized review decisions or publication. | Monitor authentication failures and operator events; rotate the managed secret; never enable public invocation as a shortcut. |
| The Cloud Run service identity has only required runtime privileges. | Dedicated service account with scoped Firestore, Vertex AI, logging, and secret access. No service-account key is distributed. | Excess privileges could expand data or infrastructure impact after compromise. | Periodically audit project and secret IAM; preserve service identity during deployments. |
| Protected Firestore access is server-side. | Repository operations run under the service identity; operator clients do not receive database credentials. | Direct client mutation could bypass transactions and validation. | Keep database access private to approved server identities; audit IAM and rejected requests. |
| Secrets are stored and referenced through managed secret infrastructure. | Cloud Run uses a named secret-version reference; secret values are not committed or logged. | Credential disclosure could permit unauthorized operator access. | Audit secret references and access logs; rotate through a new version; never display values during diagnostics. |
| Model output is untrusted input. | JSON parsing, strict schema validation, lossless repair constraints, evidence validation, duplicate validation, and bounded recovery. | Invalid or adversarial output could corrupt analysis or mislead reviewers. | Terminally fail repeated invalid output; monitor bounded failure categories and issue paths. |
| Generated analysis must pass deterministic validation before readiness. | Validation precedes the atomic analysis/review/run transaction. | Invalid analysis could appear in the review queue. | Confirm `validationOutcome`, finalization telemetry, and exact state linkage. |
| Evidence quotes require exact source grounding. | Exact contiguous substring comparison after NFC and deterministic whitespace normalization only. | Paraphrases or hallucinated quotations could receive false source authority. | Reject invalid quotes; allow one bounded correction; never enable fuzzy or punctuation-insensitive acceptance. |
| Protected records have no direct client-write path. | Analysis, review, run, and publication mutations use server repository operations and transactions. | Client writes could create orphan, duplicate, or unauthorized state. | Audit routes, IAM, deterministic identities, and Firestore invariants. |
| AI never approves or publishes automatically. | Review starts pending; only an explicit operator approval invokes atomic publication. | Unreviewed public content could be released. | Monitor review/publication events and compare published records with approved reviews. |
| Raw AI output is not required for normal operation. | Only parsed validated results or bounded safe telemetry are retained. | Incident reconstruction cannot inspect the exact rejected response. | Use issue codes, paths, classifications, lengths, provider metadata, and deterministic tests. |
| Recovery telemetry remains bounded and privacy-safe. | Strict event schemas permit counters, categories, lengths, paths, versions, and durations only. | Logs could disclose article, model, prompt, or credential content. | Scan log keys and content indicators during canaries; roll back and treat leakage as a security incident. |
| Feature flags are operational controls, not security boundaries. | Authorization and validation remain independent of flag values. | Treating a flag as access control could expose privileged behavior. | Preserve IAM and authentication on every revision; audit active and fallback flag values. |
| Production endpoints do not exist solely for internal test replay. | Internal finalization has no endpoint, operator action, or supported replay surface. | A replay endpoint would add privileged attack surface and mutation risk. | Verify through tests, deterministic identity, structural invariants, and downstream idempotency. |
| Deterministic IDs provide integrity, not authorization. | Every mutation still requires authenticated server-side logic and linkage checks. | Predictable IDs alone cannot prevent unauthorized reads or writes. | Enforce IAM and operator authentication; reject content conflicts under deterministic IDs. |
| A stable rollback revision remains available during canary activation. | Traffic is not assigned until the canary is Ready; the verified flag-off revision is retained. | A canary incident could take longer to contain. | Confirm fallback readiness before deployment and retain its exact revision name. |
| External source content may be malformed, adversarial, incomplete, or misleading. | HTTPS and registered-source validation, bounded fetches, script/style removal, normalized snapshots, prompt-injection instructions, schema and evidence validation, and human review. | Ingestion failure, misleading analysis, prompt injection, or unsupported evidence. | Fail closed on unsafe input; monitor ingestion categories; never follow source-contained instructions. |
| Publication transactions preserve approval provenance. | Approval verifies analysis, source, review state, deterministic Radar identity, and existing publication state in one transaction. | Duplicate or unapproved publication could occur. | Replay approval during controlled verification and audit duplicate/orphan groups. |
| Recovery ceilings are enforced under provider instability. | Static decision table and fixed ceilings: two transient retries, one regeneration, four total calls. | Runaway cost, latency, or repeated unsafe model attempts. | Record attempt, retry, and regeneration counts; roll back if ceilings are exceeded. |

## Baseline security posture

The active Phase 4 production revision uses
`AI_RECOVERY_ENABLED=true` and
`ATOMIC_ANALYSIS_FINALIZATION_ENABLED=true`. The stable flag-off revision
remains available for rollback. Prompt version is
`radar-decision-intelligence-v3`.

The release verification is `PASS_WITH_VERIFICATION_LIMITATION`; the sole
design-limited check is direct replay of completed internal analysis
finalization, classified `NOT_EXECUTABLE_BY_DESIGN`. This limitation creates
no material security risk and avoids adding a privileged production surface.
