import { describe, expect, it } from "vitest";
import {
  buildDecisionIntelligencePrompt,
  calculateDecisionScore,
  DECISION_INTELLIGENCE_JSON_SCHEMA,
  parseDecisionIntelligence,
  parseSignalIntelligence,
  SIGNAL_INTELLIGENCE_JSON_SCHEMA,
} from "./decision-engine";
import type { BusinessContext, ReadySignalIntelligence } from "@/domain/decision-intelligence";

const signal: ReadySignalIntelligence = {
  status: "READY",
  category: "developer_announcement",
  whatHappened: [{ text: "Google announced a developer capability.", evidenceIds: ["E1"] }],
  whatChanged: [{ text: "The capability is now available.", evidenceIds: ["E1"] }],
  whyImportant: [{ text: "The announcement adds a documented capability.", evidenceIds: ["E1"] }],
  technologies: [{ text: "Gemini API", evidenceIds: ["E1"] }],
  affectedIndustries: [],
  risks: [],
  opportunities: [],
  entities: [{ name: "Gemini", normalizedName: "Gemini", type: "model", evidenceIds: ["E1"] }],
  evidence: [{ id: "E1", quote: "Gemini API is now available", significance: "Supports availability." }],
  signalImportance: 80,
  evidenceConfidence: 90,
  warnings: [],
};

const context: BusinessContext = {
  industry: "Retail",
  companySize: "SMALL",
  aiMaturity: "EXPLORING",
  businessGoals: ["Reduce support response time"],
  currentTools: ["Help desk"],
  budgetRange: "1K_TO_10K",
  riskTolerance: "MODERATE",
};

const readyDecision = {
  status: "READY",
  decisionQuestion: "Should the retailer test the capability for support?",
  geminiInsight: [{ text: "The capability is available.", evidenceIds: ["E1"] }],
  businessImpact: [{ text: "The capability could be evaluated for the stated goal.", evidenceIds: ["E1"] }],
  availableOptions: [
    { position: "RUN_EXPERIMENT", description: "Run a limited test.", supportingEvidenceIds: ["E1"] },
    { position: "MONITOR", description: "Wait for more operating evidence.", supportingEvidenceIds: ["E1"] },
  ],
  recommendedPosition: "RUN_EXPERIMENT",
  recommendedAction: "Run a time-boxed support pilot with human oversight.",
  recommendationEvidenceIds: ["E1"],
  expectedBenefits: [{ text: "The pilot can evaluate the available capability.", evidenceIds: ["E1"] }],
  potentialRisks: [{ text: "The source does not establish retailer-specific results.", evidenceIds: ["E1"] }],
  estimatedEffort: { level: "MEDIUM", rationale: "A limited integration is required.", supportingEvidenceIds: ["E1"] },
  confidence: 75,
  supportingEvidenceIds: ["E1"],
  successCriteria: ["Measure response time without reducing answer quality."],
  reconsiderationTriggers: ["Stop if answer quality declines."],
  businessApplicability: 80,
  urgency: 40,
  expectedImpact: 70,
};

describe("Gemini Decision Intelligence Engine", () => {
  it("uses Vertex-compatible response schemas while retaining strict runtime parsing", () => {
    const forbidden = new Set(["$schema", "format", "maxItems", "maxLength", "maximum", "minItems", "minLength", "minimum", "pattern"]);
    const keys = (value: unknown): string[] =>
      !value || typeof value !== "object"
        ? []
        : Object.entries(value).flatMap(([key, child]) => [key, ...keys(child)]);
    expect(keys(SIGNAL_INTELLIGENCE_JSON_SCHEMA).filter((key) => forbidden.has(key))).toEqual([]);
    expect(keys(DECISION_INTELLIGENCE_JSON_SCHEMA).filter((key) => forbidden.has(key))).toEqual([]);
    expect(JSON.stringify(DECISION_INTELLIGENCE_JSON_SCHEMA)).toContain('"description":{');
    expect(() => parseDecisionIntelligence(JSON.stringify({ ...readyDecision, confidence: 101 }), signal))
      .toThrow("schema validation");
  });

  it("accepts exact source evidence and rejects fabricated quotations", () => {
    const source = "The announcement says Gemini API is now available for developers.";
    expect(parseSignalIntelligence(JSON.stringify(signal), source).status).toBe("READY");
    expect(() => parseSignalIntelligence(JSON.stringify({
      ...signal,
      evidence: [{ ...signal.evidence[0], quote: "a fabricated quote" }],
    }), source)).toThrow("not an exact excerpt");
  });

  it("bounds an overlong exact evidence excerpt before strict validation", () => {
    const quote = "A".repeat(600);
    const parsed = parseSignalIntelligence(JSON.stringify({
      ...signal,
      evidence: [{ ...signal.evidence[0], quote }],
    }), quote);
    expect(parsed.evidence[0].quote).toHaveLength(500);
  });

  it("rejects decision claims that cite evidence absent from Stage A", () => {
    expect(() => parseDecisionIntelligence(JSON.stringify({
      ...readyDecision,
      recommendationEvidenceIds: ["E2"],
    }), signal)).toThrow("unknown evidence");
  });

  it("computes the explainable final score in application code", () => {
    expect(calculateDecisionScore({
      signalImportance: 80,
      evidenceConfidence: 90,
      businessApplicability: 80,
      urgency: 40,
      expectedImpact: 70,
    })).toEqual({
      signalImportance: 80,
      evidenceConfidence: 90,
      businessApplicability: 80,
      urgency: 40,
      expectedImpact: 70,
      decisionScore: 74,
    });
  });

  it("keeps raw source data out of Stage B and requires the fixed taxonomy", () => {
    const prompt = buildDecisionIntelligencePrompt(signal, context);
    expect(prompt).toContain("ACT_NOW, RUN_EXPERIMENT, MONITOR, DEFER, IGNORE, or AVOID");
    expect(prompt).toContain("Application code computes the final Decision Score");
    expect(prompt).not.toContain("SOURCE:");
  });
});
