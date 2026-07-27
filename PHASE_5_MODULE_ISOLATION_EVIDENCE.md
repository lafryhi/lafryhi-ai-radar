# Phase 5.1 Module Isolation Evidence

## Classification

- Original design classification: `ISOLATION_FEASIBLE_WITH_LIMITATIONS`
- Implemented 5.1A classification: `ISOLATION_ENFORCED_FOR_5_1A`
- Assessment date: 2026-07-27
- Repository commit inspected: `79dd9067e37482a1b4684652c78f62361d1773a5`
- Implementation status: 5.1A pure boundary implemented; 5.1B not started
- Entry impact: 5.1A complete; 5.1B authorized with continued enforcement

The module directory and static import/capability tests now exist. The remaining limitation is that the 5.1B utilities and corpus harness do not exist and must pass the same boundary plus harness-specific network/filesystem tests.

## Repository-backed observations

### Current domain boundary

- `src/domain/schemas.ts` contains Zod schemas and domain types.
- `src/domain/domain-policy.ts` contains pure domain comparison helpers.
- `src/domain/schemas.test.ts` tests domain schemas.
- The `@/*` TypeScript path maps to `./src/*`.

This shows a feasible home for pure domain code without route, repository, or provider dependencies.

### Service boundary

`src/services/` contains pipeline orchestration, AI analysis, ingestion, review, finalization, recovery, operator/dashboard services, and event logging. `src/services/pipeline.ts` imports repository, AI, ingestion, finalization, and telemetry concerns and is therefore prohibited as a dependency of pure Phase 5.1 modules.

### Repository and Firestore boundary

- `src/persistence/repository.ts` defines repository contracts and imports domain schemas.
- `src/persistence/memory.ts` and `src/persistence/local.ts` implement mutable adapters.
- `src/persistence/firestore.ts` imports `@google-cloud/firestore`.
- `src/persistence/index.ts` selects Firestore or local persistence using environment variables.
- `src/services/runtime-diagnostics.ts` also imports Firestore for explicit diagnostics.

Pure Phase 5.1 modules must not import any `src/persistence/` module or runtime diagnostics.

### Gemini/Vertex boundary

- `src/services/ai.ts` imports `@google/genai` and constructs `GoogleGenAI` with Vertex configuration.
- `src/services/runtime-diagnostics.ts` also imports `@google/genai`.

Pure Phase 5.1 modules must not import these files, `@google/genai`, or any provider abstraction. Model calls are out of scope.

### Route and Cloud Run entry boundary

Next.js route handlers are under `src/app/api/`, including health, operator, RSS, diagnostics, recovery, and source-processing routes. Operator pages/actions are under `src/app/operator/`. The Cloud Run service executes the built Next.js application; no separate Phase 5 entry point exists.

No Phase 5.1 pure module may be imported from a route or production service during the offline foundation milestone. No route, endpoint, action, or scheduled handler is authorized.

### Authentication boundary

- `src/auth/operator.ts` accesses Next.js cookies and operator-token configuration.
- Internal operator routes validate operator tokens.
- Operator layouts/actions enforce authenticated access.

Pure modules cannot import `src/auth/`, `next/headers`, cookies, request headers, or environment credentials.

### Publication boundary

- `src/services/review.ts` invokes the repository approval/publication operation.
- `src/persistence/repository.ts`, `memory.ts`, `local.ts`, and `firestore.ts` contain publication contracts/implementations.
- Operator routes/actions are the supported human decision path.

Phase 5.1 cannot import review/publication services or repository interfaces.

### Existing test layout

Tests are colocated as `*.test.ts` under `src/domain`, `src/services`, and `src/persistence`, with shared fixtures in `src/test/fixtures.ts`. Vitest runs 190 tests across 18 files at the inspected commit.

## Implemented and future locations

The production and colocated test boundary is implemented at:

### Pure implementation

```text
src/domain/phase5/source-intelligence/
  artifact-envelope.ts
  identifiers.ts
  index.ts
  provenance.ts
  utc-time.ts
  validation-error.ts
  normalization.ts        # future 5.1B
  canonical-url.ts        # future 5.1B
  source-fingerprint.ts   # future 5.1B
```

### Colocated tests

```text
src/domain/phase5/source-intelligence/*.test.ts
```

### Test-local governed fixtures/harness

```text
src/test/phase5/
  corpus/
  harness/
```

Fixture content is not created until corpus governance approval is applied sample by sample.

## Allowed dependencies

Pure Phase 5.1 modules may depend only on:

- ECMAScript/TypeScript standard language capabilities;
- deterministic Node standard-library primitives explicitly approved for pure computation, such as `node:crypto` for SHA-256;
- `zod`, already present, for pure schema validation only;
- pure types/schemas under `src/domain/`;
- explicitly reviewed pure utility functions with no environment, clock, randomness, network, filesystem, logging, or mutable singleton access;
- test-local fixtures from tests only.

Production code must never import test fixtures.

## Prohibited dependencies

Pure Phase 5.1 modules must not depend on:

- `src/persistence/` or any repository interface/adapter;
- `@google-cloud/firestore` or other Google Cloud SDK clients;
- `@google/genai`, Vertex AI, Gemini, or any model/provider client;
- `src/services/`, including pipeline, ingestion, recovery, review, publication, diagnostics, and event loggers;
- `src/app/` route handlers, server actions, pages, or Next.js runtime APIs;
- `src/auth/`, cookies, headers, operator tokens, or authentication state;
- `process.env` or environment secrets;
- publication services or review-state transitions;
- production telemetry transports or console logging;
- mutable global production state.

## Dependency direction

```text
test-local harness -> pure Phase 5.1 modules -> pure domain types/utilities

prohibited:
pure modules -> services/routes/auth/persistence/providers/telemetry
production routes/services -> Phase 5.1 modules during offline foundation
```

Future production shadow integration requires a separate gate and may depend inward on pure modules; pure modules never depend outward.

## Side-effect policy

Pure algorithms:

- accept complete immutable values;
- return values or typed validation failures;
- perform no network operation;
- perform no filesystem read/write;
- do not log;
- do not read environment variables;
- do not mutate inputs or global state;
- do not create processing runs, records, reviews, or publications.

The offline corpus harness may read governed test fixtures and write bounded ephemeral reports only under the privacy contract. This I/O remains outside pure modules.

## Deterministic time and randomness

- Time-dependent inputs use an injected logical clock/cutoff value.
- Pure modules do not call `Date.now()`, `new Date()` without an input, or timers for semantic behavior.
- No randomness is permitted for identity or normalization.
- Property/generative tests use an explicit recorded seed.
- Ordering uses code-point/binary rules, never host locale.

## Production-write prohibition

- No Firestore or repository imports.
- No HTTP route or server-action import.
- No production adapter passed through dependency injection.
- No filesystem writes from pure algorithms.
- Harness output is test-local/ephemeral and bounded.

## Future enforcement options

Implemented during 5.1A:

1. Import-boundary test scanning the pure directory's static imports.
2. Production-module enumeration so unexpected files cannot bypass the scan.
3. Static capability checks for clocks, randomness, secrets, logging, writes, processes, and mutable state.
4. Strict contract tests proving only explicit pure inputs are accepted.

Still required in 5.1B:

1. Network and filesystem spies for harness qualification.
2. Inclusion of every new utility module in static enumeration.
3. Corpus harness separation from pure algorithms.
4. Measured resource and privacy enforcement.

Potential later enforcement:

1. TypeScript project/reference or lint restriction if justified without broad refactoring.
2. Changed-file audit rejecting route/service/persistence/auth/provider edits.
3. Bundle/dependency inspection proving no Google Cloud, Next.js, auth, repository, or event transport dependency.

No global lint rule or broad repository refactor was required.

## Feasibility conclusion

Isolation is implemented for 5.1A because the new code resides entirely under `src/domain/phase5/`, all focused boundary tests pass, and no production entry point imports it.

The future 5.1B corpus harness introduces test-local filesystem I/O outside pure modules and therefore requires an extended audit. Production integration remains prohibited.
