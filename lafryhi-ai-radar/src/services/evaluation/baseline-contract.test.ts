import { describe, expect, it, vi } from "vitest";
import { SignalIntelligenceSchema, type ReadySignalIntelligence } from "@/domain/decision-intelligence";
import {
  buildSignalIntelligencePrompt,
  GeminiDecisionEngine,
  parseDecisionIntelligence,
  parseSignalIntelligence,
} from "../decision-engine";
import type { ControlledGeminiClient } from "../gemini-client";
import { validateEvaluationSchemaVersion } from "./case-runner";

const evidence = [{
  id: "E1",
  quote: "The Gemini API update is available to developers.",
  significance: "It establishes availability.",
}];

const readySignal: ReadySignalIntelligence = {
  status: "READY",
  category: "developer_announcement",
  whatHappened: [{ text: "Google announced an API update.", evidenceIds: ["E1"] }],
  whatChanged: [{ text: "The update is available.", evidenceIds: ["E1"] }],
  whyImportant: [{ text: "Developers can use the documented update.", evidenceIds: ["E1"] }],
  technologies: [{ text: "Gemini API", evidenceIds: ["E1"] }],
  affectedIndustries: [],
  risks: [],
  opportunities: [],
  entities: [],
  evidence,
  signalImportance: 70,
  evidenceConfidence: 90,
  warnings: [],
};

const insufficientSignal = {
  status: "INSUFFICIENT_EVIDENCE" as const,
  reason: "The source does not establish the required change.",
  missingEvidence: ["A supported description of what changed"],
  evidence: [],
};

const readyDecision = {
  status: "READY",
  decisionQuestion: "Should the business evaluate the update?",
  geminiInsight: [{ text: "The update is available.", evidenceIds: ["E1"] }],
  businessImpact: [{ text: "The update can be evaluated.", evidenceIds: ["E1"] }],
  availableOptions: [
    { position: "RUN_EXPERIMENT", description: "Run a limited test.", supportingEvidenceIds: ["E1"] },
    { position: "MONITOR", description: "Monitor adoption.", supportingEvidenceIds: ["E1"] },
  ],
  recommendedPosition: "RUN_EXPERIMENT",
  recommendedAction: "Run a controlled test with human review.",
  recommendationEvidenceIds: ["E1"],
  expectedBenefits: [],
  potentialRisks: [],
  estimatedEffort: {
    level: "LOW",
    rationale: "A limited evaluation is sufficient.",
    supportingEvidenceIds: ["E1"],
  },
  confidence: 75,
  supportingEvidenceIds: ["E1"],
  successCriteria: ["Confirm the update meets the documented requirement."],
  reconsiderationTriggers: ["Stop if the documented behavior is absent."],
  businessApplicability: 70,
  urgency: 40,
  expectedImpact: 60,
};

const source = {
  id: "source",
  sourceUrl: "https://example.test/update",
  sourceName: "Google",
  title: "Official update",
  publishedAt: "2026-07-01T10:00:00Z",
  fetchedAt: "2026-07-01T10:00:00Z",
  normalizedText: `Official notice: ${evidence[0].quote}`.padEnd(200, " "),
  contentHash: "a".repeat(64),
  sourceType: "official_announcement" as const,
};

const businessContext = {
  industry: "Retail",
  companySize: "SMALL" as const,
  aiMaturity: "EXPLORING" as const,
  businessGoals: ["Evaluate documented API capabilities"],
  currentTools: [],
  budgetRange: "UNKNOWN" as const,
  riskTolerance: "LOW" as const,
};

function mockClient(...texts: string[]) {
  return {
    config: { primaryModel: "gemini-2.5-flash", maxOutputTokens: 8192 },
    generateContent: vi.fn()
      .mockImplementation(async () => {
        const text = texts.shift();
        return {
          response: { text },
          requestedModel: "gemini-2.5-flash",
          actualModel: "gemini-2.5-flash",
          fallbackUsed: false,
          attempts: 1,
          durationMs: 1,
          metadata: { candidateCount: 1 },
        };
      }),
  } as unknown as ControlledGeminiClient;
}

describe("authoritative Signal Intelligence baseline contract", () => {
  it("accepts READY only with a supported non-empty whyImportant array", () => {
    const source = `Official notice: ${evidence[0].quote}`;
    expect(parseSignalIntelligence(JSON.stringify(readySignal), source)).toEqual(readySignal);
    expect(() => parseSignalIntelligence(
      JSON.stringify({ ...readySignal, whyImportant: [] }),
      source,
    )).toThrow("whyImportant");
  });

  it("uses the strict insufficient-evidence branch without fabricating whyImportant", () => {
    expect(SignalIntelligenceSchema.parse(insufficientSignal)).toEqual(insufficientSignal);
    expect(SignalIntelligenceSchema.safeParse({
      ...insufficientSignal,
      whyImportant: [],
    }).success).toBe(false);
  });

  it("rejects an empty whyImportant array for every READY category", () => {
    for (const category of [
      "model_release",
      "product_launch",
      "platform_update",
      "developer_announcement",
      "grant",
      "hackathon",
      "business_opportunity",
      "policy",
      "ecosystem_change",
    ] as const) {
      expect(SignalIntelligenceSchema.safeParse({
        ...readySignal,
        category,
        whyImportant: [],
      }).success).toBe(false);
    }
  });

  it("makes the prompt's minimum requirement explicit without encouraging unsupported claims", () => {
    const prompt = buildSignalIntelligencePrompt(source);
    expect(prompt).toContain("whyImportant must each contain at least one");
    expect(prompt).toContain("Never invent a reason");
    expect(prompt).toContain("return INSUFFICIENT_EVIDENCE");
  });

  it("uses the same current schema in evaluation and permits stage-two input only after it passes", () => {
    expect(validateEvaluationSchemaVersion(readySignal, "signal")).toEqual({
      valid: true,
      version: "signal-intelligence-v1",
      errors: [],
    });
    expect(validateEvaluationSchemaVersion({ ...readySignal, whyImportant: [] }, "signal"))
      .toMatchObject({ valid: false, version: undefined });
    expect(parseDecisionIntelligence(JSON.stringify(readyDecision), readySignal).status).toBe("READY");
  });

  it("runs stage two only after the real production Signal Intelligence contract passes", async () => {
    const validClient = mockClient(JSON.stringify(readySignal), JSON.stringify(readyDecision));
    await expect(new GeminiDecisionEngine(validClient).run(source, businessContext))
      .resolves.toMatchObject({ result: { status: "READY" } });
    expect(validClient.generateContent).toHaveBeenCalledTimes(2);

    const invalidClient = mockClient(JSON.stringify({ ...readySignal, whyImportant: [] }), JSON.stringify(readyDecision));
    await expect(new GeminiDecisionEngine(invalidClient).run(source, businessContext))
      .rejects.toThrow("whyImportant");
    expect(invalidClient.generateContent).toHaveBeenCalledTimes(1);

    const insufficientClient = mockClient(JSON.stringify(insufficientSignal), JSON.stringify(readyDecision));
    await expect(new GeminiDecisionEngine(insufficientClient).run(source, businessContext))
      .resolves.toMatchObject({
        result: { status: "INSUFFICIENT_EVIDENCE", stage: "SIGNAL_INTELLIGENCE" },
      });
    expect(insufficientClient.generateContent).toHaveBeenCalledTimes(1);
  });

  it("recognizes legacy analysis separately without treating it as current stage-two input", () => {
    const legacy = {
      summary: "A sufficiently long summary of the official announcement.",
      keyPoints: ["The API update is available."],
      whyItMatters: "This is a sufficiently long legacy importance explanation.",
      category: "developer_announcement",
      importanceScore: 70,
      noveltyScore: 50,
      confidenceScore: 90,
      timelinessScore: 70,
      educationalValueScore: 60,
      developerImpactScore: 80,
      enterpriseImpactScore: 50,
      researchImpactScore: 40,
      overallRecommendation: "Needs Human Attention",
      recommendedAction: "Review the documented API update before adoption.",
      reasoning: "The source supports availability but not business-specific outcomes.",
      targetAudience: ["Developers"],
      relatedTopics: ["API"],
      mentionedCompanies: ["Google"],
      mentionedProducts: ["Gemini"],
      mentionedTechnologies: ["Gemini API"],
      entities: [],
      potentialRisks: [],
      followUpRecommended: true,
      breakingNews: false,
      estimatedReadingTime: 1,
      evidence: [{ quote: evidence[0].quote, significance: evidence[0].significance }],
      warnings: [],
      opportunity: {
        isOpportunity: false,
        deadline: null,
        eligibility: null,
        benefit: null,
        effortEstimate: null,
      },
      duplicateAnalysis: {
        similarityScore: 0,
        classification: "unique",
        relatedPreviousArticles: [],
        duplicateReason: null,
      },
    };
    expect(validateEvaluationSchemaVersion(legacy, "signal")).toMatchObject({
      valid: true,
      version: "legacy-analysis-v1",
    });
  });
});
