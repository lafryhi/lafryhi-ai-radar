# Project Memory

This file preserves durable, repository-supported engineering knowledge. Keep transient session notes and speculative conclusions out.

## Lessons Learned

- Separate implementation defects from verification limitations; use the statuses and criteria in [`GEMINI_XPRIZE_PHASE4_PRODUCTION_VERIFICATION_PROTOCOL.md`](../../GEMINI_XPRIZE_PHASE4_PRODUCTION_VERIFICATION_PROTOCOL.md).
- Treat implementation, development qualification, milestone qualification, production authorization, and deployment as distinct outcomes.
- Keep recovery lossless and bounded. Do not truncate semantic content, clamp scores, invent values, or silently discard conflicts.
- Preserve historical execution reports; add a later assessment rather than rewriting the original record.
- A `NOT_AUTHORIZED` handoff is a successful safety result: convert it to `READY` only through an explicit bounded scope grounded in existing entry, timing, and acceptance records.
- Separate deterministic corpus-control tooling from corpus content approval and milestone qualification so tooling capability cannot be mistaken for evidence.

## Architectural Decisions

- The application uses a Next.js App Router/TypeScript service with repository and AI adapter boundaries, as recorded in [`GEMINI_XPRIZE_PHASE1_IMPLEMENTATION.md`](../../GEMINI_XPRIZE_PHASE1_IMPLEMENTATION.md).
- Gemini produces analysis only; protected human approval is mandatory for publication.
- Phase 4 uses deterministic identities and atomic readiness/approval-publication boundaries.
- Phase 5 builds on frozen `v1.0.0-rc1` compatibility and begins with isolated, offline, versioned contracts and deterministic utilities.
- Phase 5 ADR authority is individual; deferred ADRs grant no implementation authority. Consult [`PHASE_5_ADR_ACCEPTANCE_RECORD.md`](../../PHASE_5_ADR_ACCEPTANCE_RECORD.md).

## Important Discoveries

- Internal finalization replay is intentionally not exposed in production; structural production evidence and tests support it under `NOT_EXECUTABLE_BY_DESIGN`.
- Phase 5.1A/5.1B pure source-intelligence modules remain isolated from routes, services, persistence, network, model, approval, and publication capabilities.
- Exact-duplicate results are advisory and cannot suppress, mutate, or delete records.
- Before the 2026-07-27 authorization checkpoint, no authoritative document defined Phase 5.1C; the continuity engine correctly blocked implementation.
- Phase 5.1C now authorizes governed corpus manifest tooling only. Corpus assembly, qualification, review, and milestone closure remain separately gated.

## Rejected Designs

- Automatic AI approval or publication is prohibited.
- Random publication identities were replaced by deterministic, idempotent publication behavior in the Phase 4 baseline.
- Lossy model-output repair and unbounded provider recovery are rejected.
- Publisher trust/status mutation and production integration are outside the authorized Phase 5.1 foundation scope.

## Known Limitations

- Phase 4 release status is `PASS_WITH_VERIFICATION_LIMITATION`, not unrestricted general availability.
- Full Phase 5.1 qualification lacks the complete 240-document/385-unit governed corpus, sealed partitions, qualified English/French/Arabic cohorts, completion threshold evidence, independent review or accepted renewed exception, and CI budget recalibration.
- Phase 5.1B URL normalization does not inspect canonical HTML or redirect chains.
- Generic URL parsing may evolve with the pinned Node runtime; golden vectors remain necessary.
- Phase 5 production integration and Phase 5.2 are unauthorized.

## Technical Debt

- Recalibrate provisional Phase 5.1 per-operation and CI budgets on the first approved CI reference run.
- Complete governed corpus manifest, checksum, partition, licensing, privacy, provenance, and annotation tooling/evidence.
- Resolve the outstanding independent-review requirement before milestone completion or record an accepted renewed exception.

## Operational Constraints

- Cloud Run remains private, and application operator access is separately protected.
- The public feed contains only explicitly approved published records.
- Phase 5.1 work may not add production writes, production reads, routes, flags, telemetry transports, persistence adapters, model calls, or deployments.
- Deployment, push, merge, tag movement, cloud mutations, and production actions require separate explicit authority.

## Performance History

- Phase 5.1B development qualification reported deterministic utility and local latency evidence on 41 synthetic fixtures; it is not full-corpus qualification.
- The governed Phase 5.1 ceilings include a 60-second corpus run, 120-second CI increment, 25 MiB artifacts, 2 MiB logs, and 512 MiB RSS, currently subject to the timing and recalibration rules in [`PHASE_5_1_GATE_TIMING_MATRIX.md`](../../PHASE_5_1_GATE_TIMING_MATRIX.md).
- The execution-framework baseline validation passed 22 test files and 231 tests plus lint, typecheck, and production build.

## Security and Privacy Lessons

- Treat sources and corpus content as untrusted.
- Never place prompts, raw model output, source/article bodies, evidence quotes, credentials, secrets, tokens, cookies, or forbidden fields in telemetry.
- Use only approved corpus material with licensing, provenance, privacy, retention, partition, and checksum controls.
- Preserve server-side authorization and never expose Firestore credentials or paths to the browser.

## Future Opportunities

- Assemble and approve the governed Phase 5.1 corpus and language cohorts through a separately authorized bounded slice.
- Complete Source Intelligence observations and its shadow gate only in the accepted implementation order.
- Propose Phase 5.2 Analysis Intelligence only after the required predecessor gates and explicit authorization.
