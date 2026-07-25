# Phase 7 — Decision Intelligence Engine

**Project:** LAFRYHI AI Radar  
**Google Cloud project:** `lafryhi-ai-radar-xprize`  
**Region:** `us-central1`

## Objective and constitutional boundary

Phase 7 extends the existing production pipeline from descriptive article
analysis to structured decision support. Gemini produces evidence-grounded
scores, an advisory recommendation, duplicate analysis, and normalized
entities. A human operator remains solely responsible for approval, rejection,
and publication.

No automatic decision or publication path was added.

## Architecture

The existing architecture is unchanged:

1. An eligible registered source produces a bounded RSS candidate.
2. A human operator deliberately submits one candidate.
3. The existing server-side ingestion service retrieves and validates the
   article.
4. The existing pipeline loads up to 20 prior analysis summaries and metadata.
5. Vertex AI Gemini returns strict structured decision intelligence.
6. Zod validates and normalizes the result.
7. The existing repository persists one analysis and one pending review.
8. The private Operator Dashboard displays AI output separately from the human
   decision.

Firestore remains server-side. Cloud Run remains private. Secret Manager,
runtime identity, scheduler, source governance, review transitions, and
publication gating are unchanged.

## Decision schema

Every new Gemini response must contain:

- `summary`
- `keyPoints`
- `whyItMatters`
- `category`
- `importanceScore`
- `noveltyScore`
- `confidenceScore`
- `timelinessScore`
- `educationalValueScore`
- `developerImpactScore`
- `enterpriseImpactScore`
- `researchImpactScore`
- `overallRecommendation`
- `recommendedAction`
- `reasoning`
- `targetAudience`
- `relatedTopics`
- `mentionedCompanies`
- `mentionedProducts`
- `mentionedTechnologies`
- `entities`
- `potentialRisks`
- `followUpRecommended`
- `breakingNews`
- `estimatedReadingTime`
- grounded `evidence`
- `warnings`
- existing structured `opportunity`
- `duplicateAnalysis`

Scores are strict integers from 0 to 100. Allowed advisory recommendations
are `Publish`, `Needs Human Attention`, `Archive`, and `Reject`.

Entities contain a source form, normalized name, and one allowlisted type:
company, product, model, technology, programming language, cloud platform,
standard, research paper, API, or framework.

The application derives the existing `relevanceScore` from the independent
decision dimensions using a documented weighted calculation. This preserves
the approved-feed contract while ensuring new relevance values are not another
unstructured model assertion.

## Backward compatibility

Existing Phase 1–6 analysis documents are not migrated or rewritten.
`StoredAnalysisSchema` accepts the legacy record shape at read time and returns
a conservative normalized view for the dashboard. New persistence continues
through the same `analysisResults` collection and requires the full Phase 7
shape.

Legacy records receive neutral defaults only in application memory. Their
original Firestore documents remain unchanged.

## Duplicate awareness

Before Gemini evaluates a new candidate, the pipeline supplies a bounded set of
up to 20 previous records containing:

- source record ID;
- title and canonical source URL;
- publication date;
- prior summary and key points;
- related topics; and
- normalized entity names and types.

Previous article bodies and prompts are never included. Gemini returns a
similarity score, classification, related previous articles, and duplicate
reason. Duplicate status is advisory and cannot automatically reject, archive,
approve, or publish anything.

## Dashboard

The protected review detail page now separates:

1. source facts;
2. AI-generated decision intelligence;
3. independent scores and advisory recommendation;
4. recommended action, audience, topics, risks, and operational flags;
5. extracted entities;
6. duplicate analysis;
7. human decision; and
8. provenance.

The review queue supports bounded server-side filtering by status, category,
source, company, technology, recommendation, relevance, importance, novelty,
and confidence. Sorting supports the decision scores.

The Operator Dashboard calculates bounded metrics across the latest 100
analysis records:

- average importance;
- average confidence;
- common technologies;
- common companies;
- top categories;
- recommendation distribution; and
- duplicate rate.

No vector database, search service, public endpoint, or new collection was
introduced.

## Security

- Gemini output validation is strict and rejects unknown fields.
- Source and previous coverage are explicitly treated as untrusted prompt data.
- Previous coverage is bounded and excludes normalized article bodies.
- Structured events continue to contain identifiers and safe operational
  metadata only.
- Prompts, article bodies, raw Gemini responses, tokens, cookies, credentials,
  and secrets are not logged.
- Human review remains mandatory.

## Tests and local validation

Confirmed local results after the production compatibility correction:

- `npm.cmd test`: 12 test files, 61 tests passed
- `npm.cmd run lint`: passed
- `npm.cmd run typecheck`: passed
- `npm.cmd run build`: Next.js 16.2.11 production build passed

Tests cover strict output validation, derived relevance, entity normalization,
legacy-record compatibility, invalid duplicate relationships, bounded previous
coverage, company/technology/recommendation filters, decision metrics, and the
existing approval/publication invariants.

## Deployment attempt and safe rollback

Cloud Build `d7d7587d-8586-4876-bcec-2ca89a58ce62` completed successfully for
the immutable `phase7` image with digest
`sha256:3248180d90ba66f44345259885c7eff0543cc82987ec908fcea388b79f9fe36d`.
Cloud Run revision `lafryhi-ai-radar-00011-99l` was created and initially
received 100% of traffic.

The first authenticated dashboard request returned HTTP 500 before any
candidate processing. An existing Phase 6.2 analysis has a summary longer than
the new 160-character key-point bound. The legacy adapter copied that summary
into `keyPoints[0]`, so the new strict post-transform validation rejected the
read.

Traffic was immediately and safely restored to the healthy revision
`lafryhi-ai-radar-00010-zmj`; it currently serves 100% of traffic and the
authenticated operator dashboard returns HTTP 200. No candidate was processed
and Firestore counts remained unchanged:

- `rssCandidates`: 10
- `analysisResults`: 3
- `reviewDecisions`: 3
- `processingRuns`: 5
- `radarItems`: 1

The local adapter now bounds legacy-derived key points to 160 characters in
memory and a regression test covers the real failure shape. The production
document is not modified. A second corrective revision requires explicit
approval because Phase 7 authorized one production revision.

## Known limitations

- Duplicate similarity is model-assisted rather than embedding-based.
- Previous coverage is intentionally bounded to 20 recent analyses.
- Legacy records expose conservative in-memory defaults because they predate
  the Phase 7 schema.
- Operator access still uses the temporary protected operator-token mechanism.
- Decision recommendations remain advisory and require human interpretation.

The required one-candidate production validation remains blocked until the
corrective revision is separately approved and deployed.
