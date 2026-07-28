import { describe, expect, it } from "vitest";
import type { IntelligenceItem } from "@/domain/mission-control";
import type { SourceDefinition } from "@/domain/schemas";
import type { RankingInput } from "./contracts";
import {
  evaluateRankingEligibility,
  RANKING_ELIGIBILITY_CODES,
  type RankingEligibilityCode,
} from "./eligibility";
import { RANKING_POLICY_V1 } from "./policy";

const item: IntelligenceItem = {
  id: "live-candidate-1",
  title: "A completed live intelligence item",
  summary: "This completed live intelligence item contains enough validated source-grounded analysis.",
  sourceName: "Official AI Source",
  sourceDefinitionId: "source-1",
  sourceUrl: "https://example.com/article",
  category: "model_release",
  impactScore: 80,
  relevanceScore: 85,
  confidenceScore: 90,
  evidenceCount: 1,
  verificationStatus: "pending",
  editorialStatus: "pending",
  analysisStatus: "completed",
  analysisModel: "gemini-2.5-flash",
  analysisPromptVersion: "live-analysis-v1",
  keyClaims: [{
    claim: "The source announced a new model.",
    evidenceRefs: ["source-content"],
  }],
  limitations: [],
  requiresHumanReview: true,
  createdAt: "2026-07-28T10:00:00.000Z",
};

const source: SourceDefinition = {
  id: "source-1",
  displayName: "Official AI Source",
  publisher: "Official AI Source",
  canonicalDomain: "example.com",
  allowedFeedDomains: ["example.com"],
  allowedArticleDomains: ["example.com"],
  homepage: "https://example.com",
  rssUrl: "https://example.com/feed.xml",
  documentationUrl: null,
  category: "model_provider",
  language: "en",
  country: "US",
  trustLevel: "official",
  status: "enabled",
  requiresHumanReview: true,
  notes: "",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

const validInput: RankingInput = {
  intelligenceItem: item,
  sourceDefinition: source,
  reportingPeriod: {
    start: "2026-07-21T12:00:00.000Z",
    end: "2026-07-28T12:00:00.000Z",
  },
  cutoffAt: "2026-07-28T12:00:00.000Z",
  policyVersion: RANKING_POLICY_V1.version,
};

function evaluate(overrides: {
  item?: Partial<IntelligenceItem>;
  source?: Partial<SourceDefinition>;
  input?: Partial<Omit<RankingInput, "intelligenceItem" | "sourceDefinition">>;
} = {}) {
  return evaluateRankingEligibility({
    ...validInput,
    ...overrides.input,
    intelligenceItem: { ...item, ...overrides.item },
    sourceDefinition: { ...source, ...overrides.source },
  }, RANKING_POLICY_V1);
}

function expectCode(result: ReturnType<typeof evaluate>, code: RankingEligibilityCode) {
  expect(result.status).toBe("excluded");
  expect(result.reasonCodes).toContain(code);
}

describe("ranking eligibility", () => {
  it("accepts a completed eligible item", () => {
    expect(evaluate()).toEqual({ status: "eligible", reasonCodes: [] });
  });

  it("reports every individual exclusion code", () => {
    const cases: Array<[RankingEligibilityCode, Parameters<typeof evaluate>[0]]> = [
      ["ANALYSIS_NOT_COMPLETED", { item: { analysisStatus: "failed" } }],
      ["SOURCE_IDENTITY_MISSING", { item: { sourceDefinitionId: undefined } }],
      ["SOURCE_IDENTITY_MISMATCH", { item: { sourceDefinitionId: "source-2" } }],
      ["SOURCE_URL_MISSING", { item: { sourceUrl: undefined } }],
      ["SOURCE_DISABLED", { source: { status: "disabled" } }],
      ["SOURCE_BLOCKED", { source: { status: "blocked", trustLevel: "blocked" } }],
      ["SCORE_INVALID", { item: { relevanceScore: 101 } }],
      ["ANALYSIS_MODEL_MISSING", { item: { analysisModel: undefined } }],
      ["ANALYSIS_PROMPT_VERSION_MISSING", { item: { analysisPromptVersion: undefined } }],
      ["ANALYSIS_PROMPT_VERSION_UNSUPPORTED", { item: { analysisPromptVersion: "live-analysis-v2" } }],
      ["EVIDENCE_REFERENCE_UNKNOWN", { item: { keyClaims: [{ claim: "Grounded claim", evidenceRefs: ["invented"] }] } }],
      ["CLAIM_OR_LIMITATION_REQUIRED", { item: { keyClaims: [], limitations: [] } }],
      ["ITEM_OUTSIDE_REPORTING_INTERVAL", { item: { createdAt: "2026-07-20T12:00:00.000Z" } }],
      ["ITEM_TIMESTAMP_INVALID", { item: { createdAt: "not-a-date" } }],
      ["ITEM_TIMESTAMP_TOO_FAR_IN_FUTURE", { item: { createdAt: "2026-07-28T12:05:00.001Z" } }],
      ["REPORTING_CONTEXT_INVALID", { input: { reportingPeriod: { start: "2026-07-29T00:00:00.000Z", end: "2026-07-28T00:00:00.000Z" } } }],
    ];

    expect(cases.map(([code]) => code)).toEqual(RANKING_ELIGIBILITY_CODES);
    for (const [code, overrides] of cases) expectCode(evaluate(overrides), code);
  });

  it("collects simultaneous reasons in stable documented order", () => {
    const result = evaluate({
      item: {
        analysisStatus: "failed",
        sourceDefinitionId: undefined,
        sourceUrl: undefined,
        relevanceScore: undefined,
        analysisModel: undefined,
        analysisPromptVersion: undefined,
        keyClaims: [],
        limitations: [],
        createdAt: "not-a-date",
      },
      source: { status: "blocked", trustLevel: "blocked" },
      input: {
        reportingPeriod: {
          start: "2026-07-29T00:00:00.000Z",
          end: "2026-07-28T00:00:00.000Z",
        },
      },
    });

    expect(result).toEqual({
      status: "excluded",
      reasonCodes: [
        "ANALYSIS_NOT_COMPLETED",
        "SOURCE_IDENTITY_MISSING",
        "SOURCE_URL_MISSING",
        "SOURCE_DISABLED",
        "SOURCE_BLOCKED",
        "SCORE_INVALID",
        "ANALYSIS_MODEL_MISSING",
        "ANALYSIS_PROMPT_VERSION_MISSING",
        "CLAIM_OR_LIMITATION_REQUIRED",
        "ITEM_TIMESTAMP_INVALID",
        "REPORTING_CONTEXT_INVALID",
      ],
    });
  });

  it("handles disabled and blocked sources explicitly", () => {
    expect(evaluate({ source: { status: "disabled" } }).reasonCodes).toEqual(["SOURCE_DISABLED"]);
    expect(evaluate({
      source: { status: "blocked", trustLevel: "blocked" },
    }).reasonCodes).toEqual(["SOURCE_DISABLED", "SOURCE_BLOCKED"]);
  });

  it("accepts only known evidence references", () => {
    expect(evaluate({
      item: {
        keyClaims: [{
          claim: "Grounded in both accepted inputs.",
          evidenceRefs: ["source-content", "source-metadata"],
        }],
      },
    }).status).toBe("eligible");
    expectCode(evaluate({
      item: {
        keyClaims: [{
          claim: "References an unknown input.",
          evidenceRefs: ["source-content", "external-search"],
        }],
      },
    }), "EVIDENCE_REFERENCE_UNKNOWN");
  });

  it("accepts either a grounded claim or an explicit insufficiency limitation", () => {
    expect(evaluate().status).toBe("eligible");
    expect(evaluate({
      item: {
        keyClaims: [],
        limitations: ["Insufficient source detail for a grounded claim."],
      },
    }).status).toBe("eligible");
    expectCode(evaluate({
      item: {
        keyClaims: [],
        limitations: ["The announcement is early."],
      },
    }), "CLAIM_OR_LIMITATION_REQUIRED");
  });

  it("treats reporting interval boundaries as inclusive", () => {
    expect(evaluate({
      item: { createdAt: validInput.reportingPeriod.start },
    }).status).toBe("eligible");
    expect(evaluate({
      item: { createdAt: validInput.reportingPeriod.end },
    }).status).toBe("eligible");
    expectCode(evaluate({
      item: { createdAt: "2026-07-21T11:59:59.999Z" },
    }), "ITEM_OUTSIDE_REPORTING_INTERVAL");
  });

  it("accepts exactly five minutes of future skew and rejects anything later", () => {
    const context = {
      reportingPeriod: {
        start: "2026-07-21T12:00:00.000Z",
        end: "2026-07-28T12:10:00.000Z",
      },
      cutoffAt: "2026-07-28T12:00:00.000Z",
    };
    expect(evaluate({
      input: context,
      item: { createdAt: "2026-07-28T12:05:00.000Z" },
    }).status).toBe("eligible");
    expectCode(evaluate({
      input: context,
      item: { createdAt: "2026-07-28T12:05:00.001Z" },
    }), "ITEM_TIMESTAMP_TOO_FAR_IN_FUTURE");
  });

  it.each([
    {
      reportingPeriod: { start: "invalid", end: "2026-07-28T12:00:00.000Z" },
      cutoffAt: "2026-07-28T12:00:00.000Z",
    },
    {
      reportingPeriod: { start: "2026-07-29T12:00:00.000Z", end: "2026-07-28T12:00:00.000Z" },
      cutoffAt: "2026-07-28T12:00:00.000Z",
    },
    {
      reportingPeriod: { start: "2026-07-21T12:00:00.000Z", end: "2026-07-28T12:00:00.000Z" },
      cutoffAt: "2026-07-29T12:00:00.000Z",
    },
  ])("rejects invalid reporting context %#", (input) => {
    expectCode(evaluate({ input }), "REPORTING_CONTEXT_INVALID");
  });

  it("is deterministic across repeated calls", () => {
    const results = Array.from({ length: 20 }, () => evaluate({
      item: {
        analysisStatus: "failed",
        keyClaims: [],
        limitations: [],
      },
    }));
    expect(new Set(results.map((result) => JSON.stringify(result))).size).toBe(1);
  });

  it("does not mutate inputs or policy", () => {
    const input = structuredClone(validInput);
    const policy = structuredClone(RANKING_POLICY_V1);
    const inputBefore = structuredClone(input);
    const policyBefore = structuredClone(policy);

    evaluateRankingEligibility(input, policy);

    expect(input).toEqual(inputBefore);
    expect(policy).toEqual(policyBefore);
  });
});
