import { z } from "zod";
import { normalizeCanonicalUrl } from "./canonical-url";
import { classifyExactDuplicate, ExactDuplicateDecisionSchema } from "./exact-duplicate";
import { normalizeSourceContent, SourceNormalizationInputSchema } from "./source-normalization";
import {
  fingerprintSourceBody,
  fingerprintSourceDocument,
  fingerprintSourceTitle,
  fingerprintSourceUrl,
} from "./source-fingerprint";
import { parsePhase5Contract } from "./validation-error";

export const DEVELOPMENT_QUALIFICATION_VERSION = "phase5-development-qualification-v1" as const;

const expectedUrlOutcomeSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("NORMALIZED"),
    normalizedUrl: z.string().max(4096),
  }).strict(),
  z.object({
    status: z.literal("REJECTED"),
  }).strict(),
]);

export const UrlQualificationFixtureSchema = z.object({
  fixtureId: z.string().regex(/^p5-dev:url:[a-z0-9-]+$/).max(96),
  input: z.string().max(8192),
  expected: expectedUrlOutcomeSchema,
}).strict();

export const SourceQualificationFixtureSchema = z.object({
  fixtureId: z.string().regex(/^p5-dev:source:[a-z0-9-]+$/).max(96),
  input: SourceNormalizationInputSchema,
  expectedStatus: z.enum(["NORMALIZED", "INSUFFICIENT_CONTENT", "REJECTED"]),
  expectedTitle: z.string().max(4096).optional(),
  expectedBody: z.string().max(2 * 1024 * 1024).optional(),
}).strict();

export const DuplicateQualificationFixtureSchema = z.object({
  fixtureId: z.string().regex(/^p5-dev:duplicate:[a-z0-9-]+$/).max(96),
  left: SourceNormalizationInputSchema,
  right: SourceNormalizationInputSchema,
  leftUrl: z.string().max(4096).optional(),
  rightUrl: z.string().max(4096).optional(),
  expected: ExactDuplicateDecisionSchema,
}).strict();

export const DevelopmentQualificationFixtureSetSchema = z.object({
  version: z.literal("p5-development-fixtures-v1"),
  urls: z.array(UrlQualificationFixtureSchema).max(128),
  sources: z.array(SourceQualificationFixtureSchema).max(128),
  duplicates: z.array(DuplicateQualificationFixtureSchema).max(128),
}).strict();

const metricSchema = z.object({
  passed: z.number().int().nonnegative().max(10000),
  total: z.number().int().nonnegative().max(10000),
}).strict();

export const DevelopmentQualificationReportSchema = z.object({
  label: z.literal("DEVELOPMENT QUALIFICATION ONLY"),
  version: z.literal(DEVELOPMENT_QUALIFICATION_VERSION),
  fixtureVersion: z.literal("p5-development-fixtures-v1"),
  fixtureCount: z.number().int().nonnegative().max(384),
  metrics: z.object({
    canonicalUrlCorrectness: metricSchema,
    urlNormalizationIdempotence: metricSchema,
    sourceNormalizationIdempotence: metricSchema,
    fingerprintDeterminism: metricSchema,
    exactDuplicateTruePositive: metricSchema,
    exactDuplicatePredictedPositive: metricSchema,
    exactDuplicateActualPositive: metricSchema,
    provenanceCompleteness: metricSchema,
    validationRejectionCorrectness: metricSchema,
    falseMergeCount: z.number().int().nonnegative().max(10000),
    falseSplitCount: z.number().int().nonnegative().max(10000),
    prohibitedTelemetryCount: z.literal(0),
    nondeterminismCount: z.number().int().nonnegative().max(10000),
  }).strict(),
  failures: z.array(z.object({
    fixtureId: z.string().max(96),
    check: z.enum([
      "URL_EXPECTATION",
      "URL_IDEMPOTENCE",
      "SOURCE_EXPECTATION",
      "SOURCE_IDEMPOTENCE",
      "FINGERPRINT_DETERMINISM",
      "DUPLICATE_EXPECTATION",
      "PROVENANCE",
      "VALIDATION_REJECTION",
    ]),
    expectedCode: z.string().max(64),
    actualCode: z.string().max(64),
  }).strict()).max(256),
}).strict();

export type DevelopmentQualificationFixtureSet = z.infer<typeof DevelopmentQualificationFixtureSetSchema>;
export type DevelopmentQualificationFixtureSetInput = z.input<typeof DevelopmentQualificationFixtureSetSchema>;
export type DevelopmentQualificationReport = z.infer<typeof DevelopmentQualificationReportSchema>;

function positive(decision: z.infer<typeof ExactDuplicateDecisionSchema>): boolean {
  return decision !== "NOT_EXACT_DUPLICATE" && decision !== "INSUFFICIENT_INPUT";
}

function increment(metric: { passed: number; total: number }, passed: boolean): void {
  metric.total += 1;
  if (passed) metric.passed += 1;
}

function fingerprintSet(input: z.infer<typeof SourceNormalizationInputSchema>, url?: string) {
  const normalized = normalizeSourceContent(input);
  const normalizedUrl = url === undefined ? undefined : normalizeCanonicalUrl(url).normalizedUrl;
  return {
    url: normalizedUrl === undefined ? undefined : fingerprintSourceUrl(normalizedUrl),
    title: normalized.document.title.display === ""
      ? undefined
      : fingerprintSourceTitle(normalized.document.title.digestInput),
    body: normalized.document.body.display === ""
      ? undefined
      : fingerprintSourceBody(normalized.document.body.digestInput),
    document: normalized.status === "INSUFFICIENT_CONTENT"
      ? undefined
      : fingerprintSourceDocument(normalized.document, normalizedUrl),
  };
}

export function runDevelopmentQualification(input: unknown): DevelopmentQualificationReport {
  const fixtures = parsePhase5Contract(DevelopmentQualificationFixtureSetSchema, input);
  const failures: DevelopmentQualificationReport["failures"] = [];
  const metrics: DevelopmentQualificationReport["metrics"] = {
    canonicalUrlCorrectness: { passed: 0, total: 0 },
    urlNormalizationIdempotence: { passed: 0, total: 0 },
    sourceNormalizationIdempotence: { passed: 0, total: 0 },
    fingerprintDeterminism: { passed: 0, total: 0 },
    exactDuplicateTruePositive: { passed: 0, total: 0 },
    exactDuplicatePredictedPositive: { passed: 0, total: 0 },
    exactDuplicateActualPositive: { passed: 0, total: 0 },
    provenanceCompleteness: { passed: 0, total: 0 },
    validationRejectionCorrectness: { passed: 0, total: 0 },
    falseMergeCount: 0,
    falseSplitCount: 0,
    prohibitedTelemetryCount: 0,
    nondeterminismCount: 0,
  };

  for (const fixture of fixtures.urls) {
    try {
      const actual = normalizeCanonicalUrl(fixture.input);
      const matches = fixture.expected.status === "NORMALIZED"
        && actual.normalizedUrl === fixture.expected.normalizedUrl;
      increment(metrics.canonicalUrlCorrectness, matches);
      if (!matches) failures.push({
        fixtureId: fixture.fixtureId,
        check: "URL_EXPECTATION",
        expectedCode: fixture.expected.status,
        actualCode: "NORMALIZED",
      });
      const repeated = normalizeCanonicalUrl(actual.normalizedUrl);
      const idempotent = repeated.normalizedUrl === actual.normalizedUrl;
      increment(metrics.urlNormalizationIdempotence, idempotent);
      if (!idempotent) metrics.nondeterminismCount += 1;
    } catch {
      const matches = fixture.expected.status === "REJECTED";
      increment(metrics.canonicalUrlCorrectness, matches);
      increment(metrics.validationRejectionCorrectness, matches);
      if (!matches) failures.push({
        fixtureId: fixture.fixtureId,
        check: "URL_EXPECTATION",
        expectedCode: fixture.expected.status,
        actualCode: "REJECTED",
      });
    }
  }

  for (const fixture of fixtures.sources) {
    try {
      const actual = normalizeSourceContent(fixture.input);
      const matches = fixture.expectedStatus !== "REJECTED"
        && actual.status === fixture.expectedStatus
        && (fixture.expectedTitle === undefined || actual.document.title.display === fixture.expectedTitle)
        && (fixture.expectedBody === undefined || actual.document.body.display === fixture.expectedBody);
      increment(metrics.provenanceCompleteness, actual.provenance !== undefined);
      if (!matches) failures.push({
        fixtureId: fixture.fixtureId,
        check: "SOURCE_EXPECTATION",
        expectedCode: fixture.expectedStatus,
        actualCode: actual.status,
      });
      const repeated = normalizeSourceContent({
        ...fixture.input,
        title: actual.document.title.display,
        body: actual.document.body.display,
        author: actual.document.author?.display,
        publicationTimeText: actual.document.publicationTimeText?.display,
      });
      const idempotent = JSON.stringify(repeated.document) === JSON.stringify(actual.document);
      increment(metrics.sourceNormalizationIdempotence, idempotent);
      if (!idempotent) {
        metrics.nondeterminismCount += 1;
        failures.push({
          fixtureId: fixture.fixtureId,
          check: "SOURCE_IDEMPOTENCE",
          expectedCode: "IDENTICAL",
          actualCode: "DIFFERENT",
        });
      }
    } catch {
      const matches = fixture.expectedStatus === "REJECTED";
      increment(metrics.validationRejectionCorrectness, matches);
      if (!matches) failures.push({
        fixtureId: fixture.fixtureId,
        check: "SOURCE_EXPECTATION",
        expectedCode: fixture.expectedStatus,
        actualCode: "REJECTED",
      });
    }
  }

  for (const fixture of fixtures.duplicates) {
    const left = fingerprintSet(fixture.left, fixture.leftUrl);
    const right = fingerprintSet(fixture.right, fixture.rightUrl);
    const repeatedLeft = fingerprintSet(fixture.left, fixture.leftUrl);
    const deterministic = JSON.stringify(left) === JSON.stringify(repeatedLeft);
    increment(metrics.fingerprintDeterminism, deterministic);
    if (!deterministic) metrics.nondeterminismCount += 1;

    const actual = classifyExactDuplicate({
      artifactId: fixture.left.artifactId,
      generatedAt: fixture.left.generatedAt,
      provenance: fixture.left.provenance,
      left,
      right,
    });
    const expectedPositive = positive(fixture.expected);
    const actualPositive = positive(actual.decision);
    if (expectedPositive) increment(metrics.exactDuplicateActualPositive, actualPositive);
    if (actualPositive) increment(metrics.exactDuplicatePredictedPositive, expectedPositive);
    if (expectedPositive) increment(metrics.exactDuplicateTruePositive, actualPositive);
    if (!expectedPositive && actualPositive) metrics.falseMergeCount += 1;
    if (expectedPositive && !actualPositive) metrics.falseSplitCount += 1;
    increment(metrics.provenanceCompleteness, actual.provenance !== undefined);
    if (actual.decision !== fixture.expected) failures.push({
      fixtureId: fixture.fixtureId,
      check: "DUPLICATE_EXPECTATION",
      expectedCode: fixture.expected,
      actualCode: actual.decision,
    });
  }

  return parsePhase5Contract(DevelopmentQualificationReportSchema, {
    label: "DEVELOPMENT QUALIFICATION ONLY",
    version: DEVELOPMENT_QUALIFICATION_VERSION,
    fixtureVersion: fixtures.version,
    fixtureCount: fixtures.urls.length + fixtures.sources.length + fixtures.duplicates.length,
    metrics,
    failures,
  });
}
