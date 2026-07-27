import { describe, expect, it } from "vitest";
import { developmentQualificationFixtures } from "../../../test/phase5/source-intelligence-fixtures";
import {
  APPROVED_TRACKING_PARAMETERS,
  CanonicalUrlResultSchema,
  EXACT_DUPLICATE_ALGORITHM_VERSION,
  Phase5ContractValidationError,
  SOURCE_FINGERPRINT_VERSION,
  SOURCE_NORMALIZATION_VERSION,
  classifyExactDuplicate,
  fingerprintSourceBody,
  fingerprintSourceDocument,
  fingerprintSourceTitle,
  fingerprintSourceUrl,
  normalizeCanonicalUrl,
  normalizeSourceContent,
  runDevelopmentQualification,
} from "./index";

const digest = "a".repeat(64);
const generatedAt = "2026-07-27T12:00:00.000Z";

function artifactId(sequence: number): string {
  return `p5-artifact:v1:fixture:${sequence.toString(16).padStart(64, "0")}`;
}

function provenance(sequence: number) {
  return {
    contractVersion: "phase5-provenance-v1",
    sourceRecordId: `source-record-${sequence}`,
    parentArtifactIds: [],
    transformation: { identifier: "phase5.test", version: "v1" },
    contentDigest: { algorithm: "sha256", digest },
    generatedAt,
    producerIdentity: "phase5-test",
    derivationReason: "test_fixture",
    correctionLineage: [],
    supersessionLineage: [],
  };
}

function source(sequence: number, title: string, body: string, languageHint: "en" | "fr" | "ar" | "mixed" | "unknown" = "en") {
  return {
    artifactId: artifactId(sequence),
    generatedAt,
    provenance: provenance(sequence),
    title,
    body,
    languageHint,
  };
}

describe("Phase 5.1B canonical URL normalization", () => {
  it("normalizes only conservative structural URL components", () => {
    expect(normalizeCanonicalUrl("HTTP://EXAMPLE.TEST:80/a/../story?b=2&a=1#part").normalizedUrl)
      .toBe("http://example.test/story?a=1&b=2");
    expect(normalizeCanonicalUrl("https://example.test:8443/story/").normalizedUrl)
      .toBe("https://example.test:8443/story/");
    expect(normalizeCanonicalUrl("https://münchen.example/café").normalizedUrl)
      .toBe("https://xn--mnchen-3ya.example/caf%C3%A9");
  });

  it("removes exactly the approved tracking parameter allowlist case-insensitively", () => {
    const url = new URL("https://example.test/story");
    for (const name of APPROVED_TRACKING_PARAMETERS) url.searchParams.append(name.toUpperCase(), "synthetic");
    url.searchParams.append("source", "wire");
    url.searchParams.append("campaign", "meaningful");
    const result = normalizeCanonicalUrl(url.toString());
    expect(result.removedQueryParameters).toHaveLength(APPROVED_TRACKING_PARAMETERS.length);
    expect(result.normalizedUrl).toContain("campaign=meaningful");
    expect(result.normalizedUrl).toContain("source=wire");
  });

  it("preserves meaningful and duplicate query values while ordering names by code point", () => {
    const result = normalizeCanonicalUrl("https://example.test/?z=9&id=2&id=1&a=0&reference=x");
    expect(result.retainedQueryParameters).toEqual([
      { name: "a", value: "0" },
      { name: "id", value: "2" },
      { name: "id", value: "1" },
      { name: "reference", value: "x" },
      { name: "z", value: "9" },
    ]);
  });

  it("is idempotent", () => {
    const first = normalizeCanonicalUrl("https://EXAMPLE.test:443/a/../story/?utm_source=x&id=2&id=1#x");
    const second = normalizeCanonicalUrl(first.normalizedUrl);
    expect(second.normalizedUrl).toBe(first.normalizedUrl);
  });

  it("rejects unsupported schemes, malformed URLs, credentials, controls, and excessive input safely", () => {
    for (const value of [
      "javascript:alert(1)",
      "data:text/plain,hello",
      "file:///tmp/story",
      "not a url",
      "https://user:password@example.test/",
      "https://example.test/\u0000unsafe",
      `https://example.test/${"x".repeat(4096)}`,
    ]) {
      expect(() => normalizeCanonicalUrl(value)).toThrow(Phase5ContractValidationError);
      try {
        normalizeCanonicalUrl(value);
      } catch (error) {
        expect(JSON.stringify(error)).not.toContain(value);
      }
    }
  });

  it("returns a strict bounded result", () => {
    const result = normalizeCanonicalUrl("https://example.test/?utm_source=x&id=1");
    expect(CanonicalUrlResultSchema.safeParse({ ...result, rawUrl: "forbidden" }).success).toBe(false);
  });
});

describe("Phase 5.1B source normalization", () => {
  it("normalizes NFC, line endings, whitespace, and forbidden controls", () => {
    const result = normalizeSourceContent(source(1, "  Cafe\u0301  ", " First\tline\r\n\u0007Second  line "));
    expect(result.document.title.display).toBe("Café");
    expect(result.document.body.display).toBe("First line\nSecond line");
    expect(result.version).toBe(SOURCE_NORMALIZATION_VERSION);
  });

  it("preserves canonical case, punctuation, accents, apostrophes, and compatibility distinctions", () => {
    const result = normalizeSourceContent(source(2, "L’ŒUVRE", "① != 1; punctuation—stays.", "fr"));
    expect(result.document.title.display).toBe("L’ŒUVRE");
    expect(result.document.title.comparison).toBe("l’œuvre");
    expect(result.document.body.display).toBe("① != 1; punctuation—stays.");
    expect(result.document.body.display).not.toContain("1 != 1");
  });

  it("preserves Arabic letters, diacritics, tatweel, and mixed scripts", () => {
    const arabic = normalizeSourceContent(source(3, "تَقْــرِير", "هٰذَا نَصٌّ.", "ar"));
    expect(arabic.document.title.display).toBe("تَقْــرِير");
    expect(arabic.document.body.display).toBe("هٰذَا نَصٌّ.");
    const mixed = normalizeSourceContent(source(4, "Radar رادار", "Français ونص عربي.", "mixed"));
    expect(mixed.document.body.display).toBe("Français ونص عربي.");
    expect(mixed.warnings).toContain("MIXED_LANGUAGE_HINT");
  });

  it("returns explicit insufficient content without inventing values", () => {
    const result = normalizeSourceContent(source(5, " \t ", "\r\n"));
    expect(result.status).toBe("INSUFFICIENT_CONTENT");
    expect(result.document.title.display).toBe("");
    expect(result.document.body.display).toBe("");
  });

  it("rejects oversized content with a privacy-safe error", () => {
    const marker = "SENSITIVE-SYNTHETIC-MARKER";
    try {
      normalizeSourceContent(source(6, "Title", `${marker}${"x".repeat(2 * 1024 * 1024)}`));
      throw new Error("Expected rejection.");
    } catch (error) {
      expect(error).toBeInstanceOf(Phase5ContractValidationError);
      expect(JSON.stringify(error)).not.toContain(marker);
    }
  });

  it("is deterministic and idempotent", () => {
    const input = source(7, "  Mixed CASE  ", "Line  one\r\nLine two");
    const first = normalizeSourceContent(input);
    const repeated = normalizeSourceContent(input);
    const normalizedAgain = normalizeSourceContent({
      ...input,
      title: first.document.title.display,
      body: first.document.body.display,
    });
    expect(repeated).toEqual(first);
    expect(normalizedAgain.document).toEqual(first.document);
  });
});

describe("Phase 5.1B source fingerprints", () => {
  it("is deterministic, versioned, domain-separated, and independent of time/environment", () => {
    const title = fingerprintSourceTitle("same");
    expect(fingerprintSourceTitle("same")).toEqual(title);
    expect(title.version).toBe(SOURCE_FINGERPRINT_VERSION);
    expect(fingerprintSourceBody("same").id).not.toBe(title.id);
    expect(fingerprintSourceUrl("same").id).not.toBe(title.id);
  });

  it("uses unambiguous field boundaries for document fingerprints", () => {
    const first = normalizeSourceContent(source(8, "ab", "c")).document;
    const second = normalizeSourceContent(source(9, "a", "bc")).document;
    expect(fingerprintSourceDocument(first).id).not.toBe(fingerprintSourceDocument(second).id);
  });

  it("distinguishes case and punctuation while equating approved normalized inputs", () => {
    expect(fingerprintSourceTitle("Title").id).not.toBe(fingerprintSourceTitle("title").id);
    expect(fingerprintSourceBody("Text.").id).not.toBe(fingerprintSourceBody("Text").id);
    const left = normalizeSourceContent(source(10, "Café", "Same  body.")).document;
    const right = normalizeSourceContent(source(11, "Cafe\u0301", "Same body.")).document;
    expect(fingerprintSourceDocument(left)).toEqual(fingerprintSourceDocument(right));
  });
});

describe("Phase 5.1B exact duplicate classification", () => {
  it("classifies complete, body-only, URL-only, title-only, non-exact, and insufficient inputs", () => {
    const base = {
      artifactId: artifactId(20),
      generatedAt,
      provenance: provenance(20),
    };
    const url = fingerprintSourceUrl("https://example.test/story");
    const title = fingerprintSourceTitle("Title");
    const body = fingerprintSourceBody("Body");
    const document = fingerprintSourceDocument(normalizeSourceContent(source(21, "Title", "Body")).document);
    const run = (left: object, right: object) => classifyExactDuplicate({ ...base, left, right }).decision;
    expect(run({ document }, { document })).toBe("EXACT_DOCUMENT_DUPLICATE");
    expect(run({ body }, { body })).toBe("EXACT_BODY_DUPLICATE");
    expect(run({ url }, { url })).toBe("EXACT_URL_DUPLICATE");
    expect(run({ title }, { title })).toBe("EXACT_TITLE_DUPLICATE");
    expect(run({ title, body }, { title, body: fingerprintSourceBody("Different") })).toBe("NOT_EXACT_DUPLICATE");
    expect(run({}, {})).toBe("INSUFFICIENT_INPUT");
  });

  it("does not merge same-URL content conflicts or same-event title matches", () => {
    const base = {
      artifactId: artifactId(22),
      generatedAt,
      provenance: provenance(22),
    };
    const url = fingerprintSourceUrl("https://example.test/story");
    const title = fingerprintSourceTitle("Shared event");
    const result = classifyExactDuplicate({
      ...base,
      left: { url, title, body: fingerprintSourceBody("Version A") },
      right: { url, title, body: fingerprintSourceBody("Version B") },
    });
    expect(result.decision).toBe("NOT_EXACT_DUPLICATE");
    expect(result.advisoryOnly).toBe(true);
    expect(result.algorithmVersion).toBe(EXACT_DUPLICATE_ALGORITHM_VERSION);
  });
});

describe("Phase 5.1B development qualification harness", () => {
  it("passes all synthetic expected labels with bounded privacy-safe output", () => {
    const report = runDevelopmentQualification(developmentQualificationFixtures);
    expect(report.label).toBe("DEVELOPMENT QUALIFICATION ONLY");
    expect(report.fixtureCount).toBe(41);
    expect(report.failures).toEqual([]);
    expect(report.metrics.falseMergeCount).toBe(0);
    expect(report.metrics.falseSplitCount).toBe(0);
    expect(report.metrics.prohibitedTelemetryCount).toBe(0);
    expect(report.metrics.nondeterminismCount).toBe(0);
    expect(report.metrics.canonicalUrlCorrectness.passed).toBe(report.metrics.canonicalUrlCorrectness.total);
    expect(report.metrics.sourceNormalizationIdempotence.passed).toBe(report.metrics.sourceNormalizationIdempotence.total);
    expect(report.metrics.fingerprintDeterminism.passed).toBe(report.metrics.fingerprintDeterminism.total);
    expect(report.metrics.exactDuplicatePredictedPositive.passed)
      .toBe(report.metrics.exactDuplicatePredictedPositive.total);
    expect(report.metrics.exactDuplicateActualPositive.passed)
      .toBe(report.metrics.exactDuplicateActualPositive.total);
    const serialized = JSON.stringify(report);
    for (const prohibited of ["A synthetic report", "L’économie évolue", "هذا نص عربي", "password"]) {
      expect(serialized).not.toContain(prohibited);
    }
    expect(Buffer.byteLength(serialized, "utf8")).toBeLessThan(2 * 1024 * 1024);
  });

  it("is byte-deterministic across repeated in-memory runs", () => {
    const first = JSON.stringify(runDevelopmentQualification(developmentQualificationFixtures));
    const second = JSON.stringify(runDevelopmentQualification(developmentQualificationFixtures));
    expect(second).toBe(first);
  });
});
