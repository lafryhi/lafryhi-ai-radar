# Phase 1 Implementation

## Implemented architecture

One Next.js App Router/TypeScript service provides the public feed, protected operator console, server actions, ingestion, Vertex AI analysis, schema validation, review gate, and repository adapters. It is built as a standalone container for Cloud Run.

Persistence uses one domain model through a `RadarRepository` interface. Local development uses an atomic JSON file; production uses Firestore collections. AI uses an `AiAnalyzer` interface. `VertexAiAnalyzer` is the only runtime adapter; tests inject a deterministic in-process mock.

## Folder structure

```text
src/
├── app/                 # public feed, operator UI, server actions
├── auth/                # temporary operator token guard
├── domain/              # strict Zod schemas and inferred types
├── persistence/         # interface, local, memory-test, Firestore
├── services/            # ingestion, Vertex AI, pipeline, review
└── test/                # test-only fixtures
```

Legacy material remains in its original directories. No existing planning/static file was moved or deleted. The five Phase 0 documents remain at root.

## Pipeline

1. Operator submits an HTTPS URL.
2. Ingestion accepts only configured Google authoritative hosts, fetches bounded HTML, extracts title/date/text, hashes the content, and rejects duplicates.
3. A processing run is persisted.
4. Vertex AI Gemini receives only the source record and versioned evidence-bounded prompt.
5. JSON is parsed and validated with `AnalysisResultSchema`.
6. Valid analysis receives a pending review; invalid output marks the run failed.
7. Operator inspects source, analysis, evidence, warnings, scores, model/run metadata and approves, rejects, requests changes, or reruns.
8. Approval creates a schema-validated public Radar item containing source/run/analysis/review provenance. Other states never publish.

## Setup and local development

Follow `README.md`, copy `.env.example`, choose a long operator token, configure Application Default Credentials, and run `npm run dev`. Local records are stored under `.data/` and ignored by Git.

## Vertex AI

Enable Vertex AI in the configured project. Set project, region, and Gemini model environment values. The `@google/genai` client runs in Vertex AI mode. The prompt version is `radar-analysis-v1`, temperature is 0.1, response MIME type is JSON, and all responses cross the Zod schema boundary.

No successful live Vertex call is claimed until credentials/project configuration are provided and an operator processes a source.

## Firestore

Create a Native mode Firestore database, give the Cloud Run service identity least-privilege read/write access, set `PERSISTENCE_ADAPTER=firestore`, and optionally set the database ID. Collections are `sourceRecords`, `processingRuns`, `analysisResults`, `reviewDecisions`, and `radarItems`.

## Cloud Run

Build the Dockerfile, push through an approved Google Cloud build/registry workflow, and deploy with port 8080. Configure ordinary values as runtime environment variables and inject the operator token from Secret Manager. Cloud Run deployment was not executed in Phase 1 unless separately reported.

## Temporary operator access

`OPERATOR_ACCESS_TOKEN` is compared by SHA-256 digests using timing-safe comparison and stored in a scoped HTTP-only, same-site cookie for eight hours. This only gates the Phase 1 console; it is explicitly not user authentication or a final operator identity system.

## Known limitations

- Only three explicitly allowed Google authoritative domain families and HTML announcements are supported.
- HTML extraction is deliberately small and may reject pages without extractable publication metadata.
- No scheduler, broad ingestion, Firebase Authentication, personalization, payment, user tracking, or external action execution.
- Local JSON storage is single-instance development storage and must not be used across Cloud Run instances.
- Estimated cost is nullable because price tables are not hard-coded; token usage is stored when Vertex returns it.
- Review edits are not implemented; “needs changes” plus rerun is the controlled loop.
- Firestore integration requires real project/IAM configuration and emulator/integration testing.

## Phase 2 recommendation

Replace the temporary operator guard with Firebase Authentication and an operator role, deploy staging on Cloud Run with Firestore, execute and capture one real Vertex AI pipeline run, then add a small evaluated source registry. Do not broaden sources until extraction and grounded-analysis evaluation pass on a representative set.

