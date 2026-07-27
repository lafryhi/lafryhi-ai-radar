import { afterEach, describe, expect, it, vi } from "vitest";
import { geminiAnalysisFixture, sourceFixture } from "@/test/fixtures";
import {
  applyLosslessRepairs,
  parseAnalysisEnvelope,
  validateDuplicateIntegrity,
  validateEvidenceIntegrity,
} from "./analysis-validation";
import {
  DuplicateIntegrityFailure,
  EvidenceIntegrityFailure,
  ResponseEnvelopeFailure,
} from "./failure-recovery";
import { parseGeminiResponseWithRecovery, type AnalysisContext } from "./ai";

const previous = {
  sourceRecordId: "previous-source",
  title: "Previous verified announcement",
  sourceUrl: "https://cloud.google.com/blog/previous",
  publishedAt: "2026-07-23T00:00:00.000Z",
  summary: "A previous analysis summary that is long enough for validation.",
  keyPoints: ["A previous point"],
  relatedTopics: ["Developer tooling"],
  entities: [{ normalizedName: "Gemini", type: "model" as const }],
};
const context: AnalysisContext = { previousArticles: [previous] };

describe("Phase 4.1 analysis validation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("parses raw JSON and records a recognized fence as a repair", () => {
    const raw = JSON.stringify(geminiAnalysisFixture);
    expect(parseAnalysisEnvelope(raw).repairs).toEqual([]);
    expect(parseAnalysisEnvelope(`\`\`\`json\n${raw}\n\`\`\``).repairs)
      .toEqual([{ code: "unwrap_json_fence", path: "$" }]);
  });

  it.each([
    "",
    "prose before {}",
    "{\"incomplete\":",
    "```yaml\n{}\n```",
    "```json\n{}\n```\n```json\n{}\n```",
  ])("rejects an unsafe or malformed envelope without extracting content", (value) => {
    expect(() => parseAnalysisEnvelope(value)).toThrow(ResponseEnvelopeFailure);
  });

  it("applies only traceable lossless repairs", () => {
    const repaired = applyLosslessRepairs({
      ...geminiAnalysisFixture,
      summary: ` ${geminiAnalysisFixture.summary} `,
      keyPoints: [" First point ", "first point", "Second point"],
      entities: [
        { name: " Google ", normalizedName: " Google ", type: "company" },
        { name: "google", normalizedName: "google", type: "company" },
      ],
      opportunity: { isOpportunity: false, deadline: "", eligibility: " ", benefit: null, effortEstimate: null },
    });
    const value = repaired.value as Record<string, unknown>;
    expect(value.summary).toBe(geminiAnalysisFixture.summary);
    expect(value.keyPoints).toEqual(["First point", "Second point"]);
    expect(value.entities).toEqual([{ name: "Google", normalizedName: "Google", type: "company" }]);
    expect(value.opportunity).toEqual({
      isOpportunity: false, deadline: null, eligibility: null, benefit: null, effortEstimate: null,
    });
    expect(repaired.repairs.map(({ code }) => code)).toEqual(expect.arrayContaining([
      "trim_string", "deduplicate_string", "deduplicate_entity", "empty_opportunity_detail_to_null",
    ]));
  });

  it("never truncates semantic content or clamps scores", () => {
    const keyPoint = "K".repeat(200);
    const result = applyLosslessRepairs({
      ...geminiAnalysisFixture,
      keyPoints: [keyPoint],
      importanceScore: 101,
      evidence: Array.from({ length: 6 }, (_, index) => ({
        quote: `quote ${index}`, significance: `significance ${index}`,
      })),
    }).value as Record<string, unknown>;
    expect(result.keyPoints).toEqual([keyPoint]);
    expect(result.importanceScore).toBe(101);
    expect(result.evidence).toHaveLength(6);
  });

  it("validates evidence quotes against the immutable normalized source", () => {
    const valid = parseGeminiResponseWithRecovery(JSON.stringify(geminiAnalysisFixture), sourceFixture);
    expect(() => validateEvidenceIntegrity(valid, sourceFixture)).not.toThrow();
    expect(() => validateEvidenceIntegrity({
      ...valid,
      evidence: [{ quote: "A claim absent from the source", significance: "Unsupported." }],
    }, sourceFixture)).toThrow(EvidenceIntegrityFailure);
  });

  it("normalizes whitespace only for evidence comparison", () => {
    const source = { ...sourceFixture, normalizedText: `${sourceFixture.normalizedText}Exact   quoted\ntext from source.` };
    const result = parseGeminiResponseWithRecovery(JSON.stringify({
      ...geminiAnalysisFixture,
      evidence: [{ quote: "Exact quoted text from source.", significance: "Source grounded." }],
    }), source);
    expect(result.evidence[0].quote).toBe("Exact quoted text from source.");
  });

  it("validates duplicate references against the supplied context", () => {
    const valid = parseGeminiResponseWithRecovery(JSON.stringify({
      ...geminiAnalysisFixture,
      duplicateAnalysis: {
        similarityScore: 80,
        classification: "near_duplicate",
        relatedPreviousArticles: [{
          sourceRecordId: previous.sourceRecordId,
          title: previous.title,
          sourceUrl: previous.sourceUrl,
          relation: "near_duplicate",
          reason: "The source substantially overlaps the previous verified announcement.",
        }],
        duplicateReason: "The source substantially overlaps the previous verified announcement.",
      },
    }), sourceFixture, context);
    expect(() => validateDuplicateIntegrity(valid, context)).not.toThrow();

    expect(() => validateDuplicateIntegrity({
      ...valid,
      duplicateAnalysis: {
        ...valid.duplicateAnalysis,
        relatedPreviousArticles: [{
          ...valid.duplicateAnalysis.relatedPreviousArticles[0],
          sourceUrl: "https://example.com/invented",
        }],
      },
    }, context)).toThrow(DuplicateIntegrityFailure);
  });

  it("rejects contradictory unique duplicate metadata", () => {
    const valid = parseGeminiResponseWithRecovery(JSON.stringify(geminiAnalysisFixture), sourceFixture);
    expect(() => validateDuplicateIntegrity({
      ...valid,
      duplicateAnalysis: {
        similarityScore: 0,
        classification: "unique",
        relatedPreviousArticles: [{
          sourceRecordId: previous.sourceRecordId,
          title: previous.title,
          sourceUrl: previous.sourceUrl,
          relation: "same_topic",
          reason: "This contradictory reference should be rejected by integrity validation.",
        }],
        duplicateReason: "Contradictory reason.",
      },
    }, context)).toThrow(DuplicateIntegrityFailure);
  });

  it("emits one safe metric for every repair action", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    parseGeminiResponseWithRecovery(`\`\`\`json\n${JSON.stringify({
      ...geminiAnalysisFixture,
      summary: ` ${geminiAnalysisFixture.summary} `,
    })}\n\`\`\``, sourceFixture);
    const events = info.mock.calls.map(([entry]) => JSON.parse(String(entry)));
    expect(events).toHaveLength(2);
    expect(events.map(({ repairCode }) => repairCode)).toEqual(["unwrap_json_fence", "trim_string"]);
    expect(events.every((event) =>
      event.event === "ai.recovery" &&
      event.recoveryType === "lossless_repair" &&
      event.retryCount === 0 &&
      event.regenerationCount === 0 &&
      event.repairCount > 0 &&
      event.recoveryDurationMs >= 0 &&
      event.terminalFailureCategory === null)).toBe(true);
    expect(JSON.stringify(events)).not.toMatch(/authoritative source text|detailed summary/i);
  });

  it("emits terminal failure metrics without raw content", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    expect(() => parseGeminiResponseWithRecovery("unsafe secret prose", sourceFixture))
      .toThrow(ResponseEnvelopeFailure);
    const event = JSON.parse(String(info.mock.calls.at(-1)?.[0]));
    expect(event).toMatchObject({
      event: "ai.recovery",
      recoveryType: "terminal_failure",
      retryCount: 0,
      regenerationCount: 0,
      repairCount: 0,
      terminalFailureCategory: "response_envelope",
    });
    expect(JSON.stringify(event)).not.toContain("unsafe secret prose");
  });
});
