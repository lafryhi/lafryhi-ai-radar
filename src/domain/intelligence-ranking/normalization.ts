import type {
  NormalizedScore,
  RankingInput,
  RankingPolicy,
  RankingSignal,
} from "./contracts";

export const RANKING_NORMALIZATION_VERSION = "ranking-normalization-v1";
export const ACCEPTED_EVIDENCE_REFERENCES = [
  "source-content",
  "source-metadata",
] as const;
export const FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

const acceptedEvidence = new Set<string>(ACCEPTED_EVIDENCE_REFERENCES);
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface TimelinessNormalization {
  value: NormalizedScore | null;
  availability: "available" | "invalid";
  ageMs: number | null;
  withinFutureClockSkew: boolean;
}

export interface EvidenceSufficiencyNormalization {
  value: NormalizedScore;
  groundedClaimCount: number;
  uniqueAcceptedEvidenceReferences: string[];
  materialLimitationCount: number;
  claimComponent: NormalizedScore;
  referenceComponent: NormalizedScore;
  limitationPenalty: NormalizedScore;
  hasUnknownEvidenceReference: boolean;
}

export interface NormalizedRankingSignals {
  signals: RankingSignal[];
  timeliness: TimelinessNormalization;
  evidence: EvidenceSufficiencyNormalization;
}

function clamp01(value: number): NormalizedScore {
  return Math.min(1, Math.max(0, value));
}

export function normalizeScore100(value: number): NormalizedScore {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new RangeError("Score must be a finite number in [0, 100].");
  }
  return value / 100;
}

export function normalizeTimeliness(
  publishedAt: string | null | undefined,
  cutoffAt: string,
): TimelinessNormalization {
  const publishedTimestamp = typeof publishedAt === "string"
    ? Date.parse(publishedAt)
    : Number.NaN;
  const cutoffTimestamp = Date.parse(cutoffAt);

  if (!Number.isFinite(publishedTimestamp) || !Number.isFinite(cutoffTimestamp)) {
    return {
      value: null,
      availability: "invalid",
      ageMs: null,
      withinFutureClockSkew: false,
    };
  }

  const ageMs = cutoffTimestamp - publishedTimestamp;
  if (ageMs < -FUTURE_CLOCK_SKEW_MS) {
    return {
      value: null,
      availability: "invalid",
      ageMs,
      withinFutureClockSkew: false,
    };
  }

  const withinFutureClockSkew = ageMs < 0;
  let value: NormalizedScore;
  if (ageMs <= DAY_MS) value = 1;
  else if (ageMs <= 2 * DAY_MS) value = 0.90;
  else if (ageMs <= 3 * DAY_MS) value = 0.80;
  else if (ageMs <= 5 * DAY_MS) value = 0.65;
  else if (ageMs <= 7 * DAY_MS) value = 0.50;
  else if (ageMs <= 14 * DAY_MS) value = 0.25;
  else value = 0.10;

  return {
    value,
    availability: "available",
    ageMs,
    withinFutureClockSkew,
  };
}

export function normalizeEvidenceSufficiency(
  keyClaims: RankingInput["intelligenceItem"]["keyClaims"],
  limitations: RankingInput["intelligenceItem"]["limitations"],
): EvidenceSufficiencyNormalization {
  const claims = keyClaims ?? [];
  const materialLimitations = (limitations ?? []).filter(
    (limitation) => limitation.trim().length > 0,
  );
  const uniqueAcceptedReferences = new Set<string>();
  let hasUnknownEvidenceReference = false;
  let groundedClaimCount = 0;

  for (const claim of claims) {
    const acceptedReferences = claim.evidenceRefs.filter((reference) => {
      if (acceptedEvidence.has(reference)) {
        uniqueAcceptedReferences.add(reference);
        return true;
      }
      hasUnknownEvidenceReference = true;
      return false;
    });
    if (claim.claim.trim().length > 0 && acceptedReferences.length > 0) {
      groundedClaimCount += 1;
    }
  }

  const claimComponent = groundedClaimCount === 0
    ? 0
    : groundedClaimCount === 1
      ? 0.5
      : groundedClaimCount === 2
        ? 0.75
        : 1;
  const referenceComponent = Math.min(uniqueAcceptedReferences.size / 2, 1);
  const limitationPenalty = Math.min(materialLimitations.length / 4, 1);
  const value = clamp01(
    0.60 * claimComponent
      + 0.40 * referenceComponent
      - 0.25 * limitationPenalty,
  );

  return {
    value,
    groundedClaimCount,
    uniqueAcceptedEvidenceReferences: [...uniqueAcceptedReferences].sort(),
    materialLimitationCount: materialLimitations.length,
    claimComponent,
    referenceComponent,
    limitationPenalty,
    hasUnknownEvidenceReference,
  };
}

export function normalizeSourceAuthority(
  trustLevel: RankingInput["sourceDefinition"]["trustLevel"],
  policy: RankingPolicy,
): NormalizedScore | null {
  return policy.sourceAuthority[trustLevel];
}

function signal(
  factor: RankingSignal["factor"],
  rawValue: RankingSignal["rawValue"],
  normalizedValue: number | null,
  weight: number,
  explanationCodes: string[],
): RankingSignal {
  const availability = normalizedValue === null ? "invalid" : "available";
  return {
    factor,
    rawValue,
    normalizedValue,
    availability,
    weight,
    effectiveWeight: weight,
    contribution: normalizedValue === null ? 0 : normalizedValue * weight,
    normalizationVersion: RANKING_NORMALIZATION_VERSION,
    explanationCodes,
  };
}

export function normalizeRankingSignals(
  input: RankingInput,
  policy: RankingPolicy,
): NormalizedRankingSignals {
  const item = input.intelligenceItem;
  const timeliness = normalizeTimeliness(item.createdAt, input.cutoffAt);
  const evidence = normalizeEvidenceSufficiency(item.keyClaims, item.limitations);
  const sourceAuthority = normalizeSourceAuthority(
    input.sourceDefinition.trustLevel,
    policy,
  );

  return {
    signals: [
      signal("impact", item.impactScore, normalizeScore100(item.impactScore), policy.weights.impact, ["IMPACT_SIGNAL"]),
      signal("relevance", item.relevanceScore ?? null, normalizeScore100(item.relevanceScore ?? Number.NaN), policy.weights.relevance, ["RELEVANCE_SIGNAL"]),
      signal("confidence", item.confidenceScore, normalizeScore100(item.confidenceScore), policy.weights.confidence, ["CONFIDENCE_SIGNAL"]),
      signal("timeliness", item.createdAt, timeliness.value, policy.weights.timeliness, [
        timeliness.withinFutureClockSkew ? "FUTURE_WITHIN_CLOCK_SKEW" : "TIMELINESS_SIGNAL",
      ]),
      signal("evidenceSufficiency", evidence.groundedClaimCount, evidence.value, policy.weights.evidenceSufficiency, [
        evidence.value >= 0.75 ? "SUFFICIENT_GROUNDED_EVIDENCE" : "LIMITED_EVIDENCE",
      ]),
      signal("sourceAuthority", input.sourceDefinition.trustLevel, sourceAuthority, policy.weights.sourceAuthority, [
        sourceAuthority === null ? "BLOCKED_SOURCE" : "SOURCE_AUTHORITY_SIGNAL",
      ]),
    ],
    timeliness,
    evidence,
  };
}
