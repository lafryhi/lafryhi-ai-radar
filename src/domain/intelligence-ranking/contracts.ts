import type { IntelligenceItem } from "@/domain/mission-control";
import type { SourceDefinition, SourceTrustLevel } from "@/domain/schemas";

export type Score100 = number;
export type NormalizedScore = number;

export type RankingFactor =
  | "impact"
  | "relevance"
  | "confidence"
  | "timeliness"
  | "evidenceSufficiency"
  | "sourceAuthority";

export type SignalAvailability = "available" | "unknown" | "invalid";

export interface RankingSignal {
  factor: RankingFactor;
  rawValue: number | string | null;
  normalizedValue: NormalizedScore | null;
  availability: SignalAvailability;
  weight: NormalizedScore;
  effectiveWeight: NormalizedScore;
  contribution: NormalizedScore;
  normalizationVersion: string;
  explanationCodes: string[];
}

export interface ConfidenceCap {
  below: NormalizedScore;
  maximumFinalScore: Score100;
}

export interface RankingPolicy {
  version: string;
  algorithmVersion: string;
  supportedAnalysisPromptVersions: string[];
  weights: Record<RankingFactor, NormalizedScore>;
  rankBandThresholds: {
    critical: Score100;
    high: Score100;
    medium: Score100;
    low: Score100;
  };
  sourceAuthority: Record<SourceTrustLevel, NormalizedScore | null>;
  confidenceCaps: ConfidenceCap[];
}

export interface RankingInput {
  intelligenceItem: IntelligenceItem;
  sourceDefinition: SourceDefinition;
  reportingPeriod: {
    start: string;
    end: string;
  };
  cutoffAt: string;
  policyVersion: string;
}

export type RankingEligibility =
  | {
      status: "eligible";
      reasonCodes: [];
    }
  | {
      status: "excluded";
      reasonCodes: string[];
    };

export type RankBand = "critical" | "high" | "medium" | "low" | "minimal";

export interface RankingAdjustment {
  code: string;
  kind: "penalty" | "cap" | "exclusion";
  value: number | null;
  explanation: string;
}

interface RankingAssessmentBase {
  id: string;
  intelligenceItemId: string;
  sourceDefinitionId: string;
  inputDigest: string;
  signals: RankingSignal[];
  adjustments: RankingAdjustment[];
  explanationCodes: string[];
  whyRanked: string[];
  policyVersion: string;
  algorithmVersion: string;
  analysisModel: string;
  analysisPromptVersion: string;
  cutoffAt: string;
  createdAt: string;
  supersedesAssessmentId: string | null;
}

export type RankingAssessment =
  | (RankingAssessmentBase & {
      eligibility: Extract<RankingEligibility, { status: "eligible" }>;
      baseScore: Score100;
      finalScore: Score100;
      rankBand: RankBand;
    })
  | (RankingAssessmentBase & {
      eligibility: Extract<RankingEligibility, { status: "excluded" }>;
      baseScore: null;
      finalScore: null;
      rankBand: null;
    });
