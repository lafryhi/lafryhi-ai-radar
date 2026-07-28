import type {
  RankBand,
  RankingAdjustment,
  RankingEligibility,
  RankingInput,
  RankingPolicy,
  RankingSignal,
} from "./contracts";
import { evaluateRankingEligibility } from "./eligibility";
import {
  generateRankingExplanationCodes,
  generateRankingExplanations,
} from "./explanations";
import {
  normalizeEvidenceSufficiency,
  normalizeRankingSignals,
  normalizeTimeliness,
} from "./normalization";

export interface ScoreAdjustmentContext {
  confidence: number;
  materialLimitationCount: number;
  missingPublicationTimestamp: boolean;
  futureTimestampWithinClockSkew: boolean;
  analysisCompleted: boolean;
  analysisPromptVersionSupported: boolean;
  sourceBlocked: boolean;
  hasUnknownEvidenceReference: boolean;
}

export interface ScoreAdjustmentResult {
  adjustments: RankingAdjustment[];
  adjustedScore: number | null;
}

export interface RankingScoreResult {
  eligibility: RankingEligibility;
  signals: RankingSignal[];
  baseScore: number | null;
  adjustments: RankingAdjustment[];
  finalScore: number | null;
  rankBand: RankBand | null;
  explanationCodes: string[];
  whyRanked: string[];
}

const adjustmentDefinitions = {
  LOW_CONFIDENCE_CAP: {
    kind: "cap" as const,
    explanation: "Confidence policy cap applied.",
  },
  MATERIAL_LIMITATIONS: {
    kind: "penalty" as const,
    explanation: "Five-point material-limitations penalty applied.",
  },
  MISSING_PUBLICATION_TIMESTAMP: {
    kind: "penalty" as const,
    explanation: "Five-point missing-publication-time penalty applied.",
  },
  FUTURE_TIMESTAMP: {
    kind: "penalty" as const,
    explanation: "Two-point future-clock-skew penalty applied.",
  },
  UNSUPPORTED_ANALYSIS_VERSION: {
    kind: "exclusion" as const,
    explanation: "Unsupported analysis prompt version excludes the item.",
  },
  BLOCKED_SOURCE: {
    kind: "exclusion" as const,
    explanation: "Blocked source excludes the item.",
  },
  UNKNOWN_EVIDENCE: {
    kind: "exclusion" as const,
    explanation: "Unknown evidence reference excludes the item.",
  },
  FAILED_ANALYSIS: {
    kind: "exclusion" as const,
    explanation: "Incomplete or failed analysis excludes the item.",
  },
};

function adjustment(
  code: keyof typeof adjustmentDefinitions,
  value: number | null,
): RankingAdjustment {
  const definition = adjustmentDefinitions[code];
  return {
    code,
    kind: definition.kind,
    value,
    explanation: definition.explanation,
  };
}

export function calculateBaseScore(signals: RankingSignal[]): number {
  return 100 * signals.reduce((sum, signal) => {
    if (signal.availability !== "available" || signal.normalizedValue === null) {
      throw new Error(`Cannot score unavailable ranking signal: ${signal.factor}`);
    }
    return sum + signal.normalizedValue * signal.effectiveWeight;
  }, 0);
}

export function applyScoreAdjustments(
  baseScore: number,
  context: ScoreAdjustmentContext,
  policy: RankingPolicy,
): ScoreAdjustmentResult {
  const adjustments: RankingAdjustment[] = [];
  let adjustedScore = baseScore;

  const confidenceCap = policy.confidenceCaps.find(
    (cap) => context.confidence < cap.below,
  );
  if (confidenceCap && adjustedScore > confidenceCap.maximumFinalScore) {
    adjustments.push(adjustment("LOW_CONFIDENCE_CAP", confidenceCap.maximumFinalScore));
    adjustedScore = confidenceCap.maximumFinalScore;
  }
  if (context.materialLimitationCount >= 2) {
    adjustments.push(adjustment("MATERIAL_LIMITATIONS", -5));
    adjustedScore -= 5;
  }
  if (context.missingPublicationTimestamp) {
    adjustments.push(adjustment("MISSING_PUBLICATION_TIMESTAMP", -5));
    adjustedScore -= 5;
  }
  if (context.futureTimestampWithinClockSkew) {
    adjustments.push(adjustment("FUTURE_TIMESTAMP", -2));
    adjustedScore -= 2;
  }
  if (!context.analysisPromptVersionSupported) {
    adjustments.push(adjustment("UNSUPPORTED_ANALYSIS_VERSION", null));
  }
  if (context.sourceBlocked) {
    adjustments.push(adjustment("BLOCKED_SOURCE", null));
  }
  if (context.hasUnknownEvidenceReference) {
    adjustments.push(adjustment("UNKNOWN_EVIDENCE", null));
  }
  if (!context.analysisCompleted) {
    adjustments.push(adjustment("FAILED_ANALYSIS", null));
  }

  const excluded = adjustments.some((entry) => entry.kind === "exclusion");
  return {
    adjustments,
    adjustedScore: excluded ? null : Math.min(100, Math.max(0, adjustedScore)),
  };
}

export function determineRankBand(score: number, policy: RankingPolicy): RankBand {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new RangeError("Final score must be a finite number in [0, 100].");
  }
  if (score >= policy.rankBandThresholds.critical) return "critical";
  if (score >= policy.rankBandThresholds.high) return "high";
  if (score >= policy.rankBandThresholds.medium) return "medium";
  if (score >= policy.rankBandThresholds.low) return "low";
  return "minimal";
}

function exclusionAdjustments(
  input: RankingInput,
  policy: RankingPolicy,
): RankingAdjustment[] {
  const item = input.intelligenceItem;
  const evidence = normalizeEvidenceSufficiency(item.keyClaims, item.limitations);
  return applyScoreAdjustments(0, {
    confidence: Number.isFinite(item.confidenceScore) ? item.confidenceScore / 100 : 0,
    materialLimitationCount: evidence.materialLimitationCount,
    missingPublicationTimestamp: !Number.isFinite(Date.parse(item.createdAt)),
    futureTimestampWithinClockSkew: normalizeTimeliness(item.createdAt, input.cutoffAt).withinFutureClockSkew,
    analysisCompleted: item.analysisStatus === "completed",
    analysisPromptVersionSupported: Boolean(
      item.analysisPromptVersion
      && policy.supportedAnalysisPromptVersions.includes(item.analysisPromptVersion),
    ),
    sourceBlocked: input.sourceDefinition.trustLevel === "blocked",
    hasUnknownEvidenceReference: evidence.hasUnknownEvidenceReference,
  }, policy).adjustments;
}

export function scoreRankingInput(
  input: RankingInput,
  policy: RankingPolicy,
): RankingScoreResult {
  const eligibility = evaluateRankingEligibility(input, policy);
  if (eligibility.status === "excluded") {
    const adjustments = exclusionAdjustments(input, policy);
    const explanationCodes = generateRankingExplanationCodes(
      [],
      adjustments,
      input.sourceDefinition.trustLevel,
    );
    return {
      eligibility,
      signals: [],
      baseScore: null,
      adjustments,
      finalScore: null,
      rankBand: null,
      explanationCodes,
      whyRanked: generateRankingExplanations(explanationCodes),
    };
  }

  const normalized = normalizeRankingSignals(input, policy);
  const baseScore = calculateBaseScore(normalized.signals);
  const adjusted = applyScoreAdjustments(baseScore, {
    confidence: input.intelligenceItem.confidenceScore / 100,
    materialLimitationCount: normalized.evidence.materialLimitationCount,
    missingPublicationTimestamp: false,
    futureTimestampWithinClockSkew: normalized.timeliness.withinFutureClockSkew,
    analysisCompleted: true,
    analysisPromptVersionSupported: true,
    sourceBlocked: false,
    hasUnknownEvidenceReference: false,
  }, policy);
  const finalScore = Math.round((adjusted.adjustedScore ?? 0) * 100) / 100;
  const rankBand = determineRankBand(finalScore, policy);
  const explanationCodes = generateRankingExplanationCodes(
    normalized.signals,
    adjusted.adjustments,
    input.sourceDefinition.trustLevel,
  );

  return {
    eligibility,
    signals: normalized.signals,
    baseScore,
    adjustments: adjusted.adjustments,
    finalScore,
    rankBand,
    explanationCodes,
    whyRanked: generateRankingExplanations(explanationCodes),
  };
}
