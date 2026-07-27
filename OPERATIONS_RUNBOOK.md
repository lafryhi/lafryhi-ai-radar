# LAFRYHI AI Radar Operations Runbook

This runbook governs controlled release-candidate deployments. Commands must
use environment-specific project, region, service, repository, and revision
values held by the operator. Never place secrets, access tokens, credentials,
article text, evidence quotes, or sensitive URLs in command history or reports.

## Deployment prerequisites

Before changing production:

1. Confirm the worktree is clean and the intended commit is checked out.
2. Record the complete commit hash and current branch.
3. Run the full test suite and record the test count.
4. Run lint and typecheck.
5. complete a production build from the same source state.
6. Capture the active Cloud Run revision, traffic allocation, image digest,
   service identity, resource limits, timeout, concurrency, non-secret
   environment variable names/values, and secret reference names.
7. Capture `AI_RECOVERY_ENABLED` and
   `ATOMIC_ANALYSIS_FINALIZATION_ENABLED`.
8. Confirm the known-good stable revision is Ready and can receive traffic.
9. Capture Firestore pending, approved, rejected, published, failed-run, and
   source counts.
10. Confirm the selected canary source is registered, trusted, and not already
    ingested.

Stop if the commit is wrong, the worktree is dirty, a required check fails, the
fallback revision is unavailable, or production state cannot be measured.

## Immutable build

1. Tag the image with the short source commit, never `latest`.
2. Submit exactly the clean source state to the approved build service.
3. Record the build ID.
4. Wait for build success and record the registry-provided SHA-256 digest.
5. Deploy by digest, not only by tag.
6. Use a revision name that identifies the release and canary purpose.
7. Confirm the deployed digest equals the build result.

Do not move or overwrite an existing immutable release tag. A mutable tag must
not be a deployment dependency.

## Controlled deployment

1. Create the revision with zero traffic.
2. Change only the explicitly approved image and feature flags.
3. Preserve IAM, service identity, secret references, Firestore configuration,
   authentication, routes, scaling, resources, concurrency, timeout, review,
   and publication behavior.
4. Wait for:
   - `Ready=True`;
   - `ConfigurationsReady=True`; and
   - `RoutesReady=True`.
5. Perform the authenticated health check.
6. Confirm the authenticated operator route succeeds and the unauthenticated
   behavior remains unchanged.
7. Query deployment-window logs for severity `ERROR` or higher.
8. Route traffic only after all readiness checks pass.
9. Reconfirm traffic and all three readiness conditions.

Do not run migrations or change Firestore collections as part of a routine
application canary.

## Canary processing

Process exactly one new trusted source:

1. Record the candidate/source identity without logging source content.
2. Submit it once through the existing supported operator workflow.
3. Record the processing run ID.
4. Record the deterministic IDs:
   - `analysis-${processingRunId}`;
   - `review-${analysisId}`.
5. Confirm prompt version `radar-decision-intelligence-v3`.
6. Confirm:
   - initial Gemini call: 1;
   - identical transient retries: no more than 2;
   - regeneration: no more than 1 total; and
   - absolute Gemini calls: no more than 4.
7. Inspect bounded telemetry for retries, regeneration, terminal category, and
   evidence mismatch classification.
8. Confirm evidence remains an exact contiguous source substring after NFC and
   deterministic whitespace normalization only.
9. Confirm no fuzzy, case-insensitive, punctuation-insensitive,
   semantic-similarity, closest-sentence, automatic-replacement, or NFKC-based
   acceptance occurs.
10. If validation succeeds, confirm one transaction:
    - created the AnalysisResult;
    - created the pending ReviewDecision; and
    - moved the ProcessingRun to `pending_review`.
11. Confirm exact source/run/analysis/review linkage.
12. Confirm no orphan or duplicate analysis or review exists.
13. Confirm no automatic approval or publication occurred.
14. Confirm the pending review appears in the operator queue.

If `quote_not_in_source` occurs, report only bounded mismatch diagnostics.
Allow the configured single correction regeneration and fail safely if the
replacement remains invalid.

## Human approval

After all pre-approval invariants pass:

1. Identify only the canary analysis.
2. Perform exactly one explicit approval through the existing authenticated
   operator workflow.
3. Confirm the review becomes `approved`.
4. Confirm exactly one deterministic `radar-${analysisId}` item is published.
5. Replay the same approval request once only when publication idempotency is
   an approved verification requirement.
6. Confirm the replay returns the same item idempotently and does not increase
   the published count.
7. Re-run orphan and duplicate checks.

Never approve, reject, or edit unrelated pending reviews during a canary.

## Rollback procedure

When a rollback trigger occurs:

1. Immediately route 100% traffic to the verified stable flag-off revision.
2. Confirm the stable revision is Ready and healthy.
3. Restore `AI_RECOVERY_ENABLED=false` and
   `ATOMIC_ANALYSIS_FINALIZATION_ENABLED=false` in the latest service
   configuration when required.
4. Verify authenticated health and operator routes.
5. Inspect the affected run, analysis, review, and publication records.
6. Verify no partial, orphaned, duplicate, approved-without-publication, or
   publication-without-approval state exists.
7. Preserve the failed run and bounded telemetry as audit evidence.
8. Do not delete partial documents, failed runs, or diagnostic records.
9. Record final traffic, flags, revisions, invariant results, and the rollback
   reason.

Rollback must not alter IAM, secrets, authentication, Firestore schema,
approval logic, or publication logic.

## Required rollback triggers

Roll back immediately for:

- severity `ERROR` or higher caused by recovery or finalization;
- orphan analysis or review;
- inconsistent run, analysis, or review state;
- more than four Gemini calls;
- more than one regeneration;
- raw model output or sensitive content in logs;
- automatic approval or publication;
- duplicate publication;
- operator dashboard regression; or
- unexpected Firestore integrity conflict.

## Incident handling

### Evidence-integrity exhaustion

- Confirm the terminal category and bounded issue path/code.
- Record only bounded mismatch lengths and classification.
- Confirm no analysis or review was finalized.
- Do not expose or reconstruct raw output in logs.
- Do not weaken exact evidence validation.
- Roll back only if an approved rollback criterion also occurred.

### Transient Gemini failure

- Confirm the failure is timeout, HTTP 429, HTTP 5xx, or a permitted temporary
  network failure.
- Confirm the same run and immutable request were retained.
- Confirm bounded exponential backoff and any valid Retry-After value.
- Confirm no permanent provider failure was retried.

### Retry exhaustion

- Confirm ceilings were respected.
- Confirm the run failed safely with no readiness or publication records.
- Preserve bounded telemetry and investigate provider health.

### Finalization persistence failure

- Confirm validation had completed before classifying the failure.
- Confirm `validationOutcome` is not incorrectly marked failed for a
  persistence-only problem.
- Confirm persistence retry count and failure category.
- Inspect for exact completed, empty, or partial state without deleting data.

### Stale run reconciliation

- Apply only the fixed stale threshold and supported reconciliation workflow.
- Exact completed analysis/review state may reconcile the run to
  `pending_review`.
- No final records means the run may be eligible for bounded recovery.
- Partial or conflicting records are an integrity failure.
- Never create a review without a valid analysis and never publish.

### Orphan or duplicate detection

- Stop approval and publication for the affected records.
- Route to the stable revision when the condition arose from the canary.
- Preserve every document.
- Record deterministic identity and linkage discrepancies without source text.
- Escalate for integrity investigation; do not overwrite or delete.

### Operator authentication failure

- Confirm Cloud Run invocation identity and operator authentication separately.
- Check secret reference availability without displaying secret values.
- Do not weaken IAM or allow unauthenticated access as a diagnostic shortcut.

### Publication conflict

- Stop further approval attempts.
- Confirm review, analysis, source, and deterministic Radar identity.
- Preserve the conflict and transaction logs.
- Never create a second Radar item or overwrite conflicting content.

### Sensitive telemetry detection

- Treat any raw output, source/quote text, prompt body, credential, secret,
  token, or mismatching character as a rollback and security incident.
- Restrict further log access, preserve necessary audit metadata, and follow
  the approved incident process.
- Do not reproduce sensitive content in the incident report.

## Post-deployment report

Classify every requirement using exactly one of:

- `PASS`;
- `FAIL`;
- `NOT_EXECUTABLE_BY_DESIGN`;
- `NOT_RUN`; or
- `BLOCKED`.

Classify the overall gate as:

- `PASS`;
- `PASS_WITH_VERIFICATION_LIMITATION`;
- `FAIL`; or
- `INCOMPLETE`.

For every `NOT_EXECUTABLE_BY_DESIGN` result, document why the behavior is
internal, the out-of-scope mechanism required, direct non-production tests,
production structural evidence, downstream invariants, remaining uncertainty,
and material-risk assessment.

Do not report intentional production inaccessibility as an implementation
failure. Do not report a skipped supported test as design-limited.
