import type { IntelligenceItem } from "@/domain/mission-control";
import type { SourceDefinition } from "@/domain/schemas";
import type { RankingInput } from "./contracts";
import { RANKING_POLICY_V1 } from "./policy";

export const ACCEPTANCE_CUTOFF = "2026-07-28T12:00:00.000Z";

export const acceptanceSource: SourceDefinition = {
  id: "acceptance-source",
  displayName: "Acceptance Source",
  publisher: "Acceptance Source",
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

export const acceptanceItem: IntelligenceItem = {
  id: "acceptance-high-impact",
  title: "High-impact official model announcement",
  summary: "A deterministic acceptance item with sufficient grounded analysis for ranking tests.",
  sourceName: "Acceptance Source",
  sourceDefinitionId: acceptanceSource.id,
  sourceUrl: "https://example.com/article",
  category: "model_release",
  impactScore: 90,
  relevanceScore: 85,
  confidenceScore: 90,
  evidenceCount: 2,
  verificationStatus: "pending",
  editorialStatus: "pending",
  analysisStatus: "completed",
  analysisModel: "gemini-2.5-flash",
  analysisPromptVersion: "live-analysis-v1",
  keyClaims: [
    { claim: "The source announced a model.", evidenceRefs: ["source-content"] },
    { claim: "The model is available.", evidenceRefs: ["source-metadata"] },
    { claim: "The release targets developers.", evidenceRefs: ["source-content"] },
  ],
  limitations: [],
  requiresHumanReview: true,
  createdAt: "2026-07-28T10:00:00.000Z",
};

export function acceptanceInput(
  itemOverrides: Partial<IntelligenceItem> = {},
  sourceOverrides: Partial<SourceDefinition> = {},
): RankingInput {
  return {
    intelligenceItem: { ...acceptanceItem, ...itemOverrides },
    sourceDefinition: { ...acceptanceSource, ...sourceOverrides },
    reportingPeriod: {
      start: "2026-07-01T00:00:00.000Z",
      end: "2026-07-28T12:10:00.000Z",
    },
    cutoffAt: ACCEPTANCE_CUTOFF,
    policyVersion: RANKING_POLICY_V1.version,
  };
}

export const RANKING_ACCEPTANCE_CORPUS = [
  {
    name: "high impact",
    input: acceptanceInput(),
    expected: {
      normalizedSignals: [0.90, 0.85, 0.90, 1, 1, 1],
      baseScore: 91.25,
      adjustments: [],
      finalScore: 91.25,
      rankBand: "critical",
    },
  },
  {
    name: "low confidence",
    input: acceptanceInput({ id: "acceptance-low-confidence", impactScore: 95, relevanceScore: 90, confidenceScore: 30 }),
    expected: {
      normalizedSignals: [0.95, 0.90, 0.30, 1, 1, 1],
      baseScore: 82,
      adjustments: ["LOW_CONFIDENCE_CAP"],
      finalScore: 49.99,
      rankBand: "low",
    },
  },
  {
    name: "old important",
    input: acceptanceInput({ id: "acceptance-old-important", impactScore: 95, relevanceScore: 90, createdAt: "2026-07-01T00:00:00.000Z" }),
    expected: {
      normalizedSignals: [0.95, 0.90, 0.90, 0.10, 1, 1],
      baseScore: 85,
      adjustments: [],
      finalScore: 85,
      rankBand: "critical",
    },
  },
  {
    name: "future timestamp",
    input: acceptanceInput({ id: "acceptance-future", createdAt: "2026-07-28T12:05:00.000Z" }),
    expected: {
      normalizedSignals: [0.90, 0.85, 0.90, 1, 1, 1],
      baseScore: 91.25,
      adjustments: ["FUTURE_TIMESTAMP"],
      finalScore: 89.25,
      rankBand: "critical",
    },
  },
  {
    name: "multiple limitations",
    input: acceptanceInput({
      id: "acceptance-limitations",
      limitations: ["Missing independent confirmation.", "Incomplete rollout details."],
    }),
    expected: {
      normalizedSignals: [0.90, 0.85, 0.90, 1, 0.875, 1],
      baseScore: 90,
      adjustments: ["MATERIAL_LIMITATIONS"],
      finalScore: 85,
      rankBand: "critical",
    },
  },
] as const;

export const EXCLUDED_ACCEPTANCE_CORPUS = [
  {
    name: "blocked source",
    input: acceptanceInput(
      { id: "acceptance-blocked" },
      { status: "blocked", trustLevel: "blocked" },
    ),
    expectedAdjustment: "BLOCKED_SOURCE",
  },
  {
    name: "unsupported prompt",
    input: acceptanceInput({
      id: "acceptance-unsupported",
      analysisPromptVersion: "live-analysis-v2",
    }),
    expectedAdjustment: "UNSUPPORTED_ANALYSIS_VERSION",
  },
  {
    name: "missing evidence",
    input: acceptanceInput({
      id: "acceptance-missing-evidence",
      keyClaims: [{ claim: "Unsupported claim.", evidenceRefs: ["unknown-evidence"] }],
    }),
    expectedAdjustment: "UNKNOWN_EVIDENCE",
  },
] as const;

export const RANKING_ORDERING_ACCEPTANCE_CORPUS = {
  name: "duplicate scores and fully tied candidates",
  candidates: [
    { id: "tied-c", title: "Same title", finalScore: 80 },
    { id: "higher-score", title: "Later title", finalScore: 90 },
    { id: "tied-a", title: "Same title", finalScore: 80 },
    { id: "tied-b", title: "Same title", finalScore: 80 },
  ],
  expectedOrdering: ["higher-score", "tied-a", "tied-b", "tied-c"],
} as const;
