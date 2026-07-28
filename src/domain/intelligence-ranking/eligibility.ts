import type { RankingEligibility, RankingInput, RankingPolicy } from "./contracts";

export const RANKING_ELIGIBILITY_CODES = [
  "ANALYSIS_NOT_COMPLETED",
  "SOURCE_IDENTITY_MISSING",
  "SOURCE_IDENTITY_MISMATCH",
  "SOURCE_URL_MISSING",
  "SOURCE_DISABLED",
  "SOURCE_BLOCKED",
  "SCORE_INVALID",
  "ANALYSIS_MODEL_MISSING",
  "ANALYSIS_PROMPT_VERSION_MISSING",
  "ANALYSIS_PROMPT_VERSION_UNSUPPORTED",
  "EVIDENCE_REFERENCE_UNKNOWN",
  "CLAIM_OR_LIMITATION_REQUIRED",
  "ITEM_OUTSIDE_REPORTING_INTERVAL",
  "ITEM_TIMESTAMP_INVALID",
  "ITEM_TIMESTAMP_TOO_FAR_IN_FUTURE",
  "REPORTING_CONTEXT_INVALID",
] as const;

export type RankingEligibilityCode = typeof RANKING_ELIGIBILITY_CODES[number];

const KNOWN_EVIDENCE_REFERENCES = new Set(["source-content", "source-metadata"]);
const INSUFFICIENCY_PATTERN = /\b(insufficient|incomplete|not enough|missing|unavailable)\b/i;
const FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

function isValidScore(value: unknown): value is number {
  return typeof value === "number"
    && Number.isFinite(value)
    && Number.isInteger(value)
    && value >= 0
    && value <= 100;
}

function timestamp(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function evaluateRankingEligibility(
  input: RankingInput,
  policy: RankingPolicy,
): RankingEligibility {
  const found = new Set<RankingEligibilityCode>();
  const item = input.intelligenceItem;
  const source = input.sourceDefinition;

  if (item.analysisStatus !== "completed") found.add("ANALYSIS_NOT_COMPLETED");

  if (!item.sourceDefinitionId) {
    found.add("SOURCE_IDENTITY_MISSING");
  } else if (item.sourceDefinitionId !== source.id) {
    found.add("SOURCE_IDENTITY_MISMATCH");
  }

  if (!item.sourceUrl) found.add("SOURCE_URL_MISSING");
  if (source.status !== "enabled") found.add("SOURCE_DISABLED");
  if (source.trustLevel === "blocked") found.add("SOURCE_BLOCKED");

  if (
    !isValidScore(item.relevanceScore)
    || !isValidScore(item.impactScore)
    || !isValidScore(item.confidenceScore)
  ) {
    found.add("SCORE_INVALID");
  }

  if (!item.analysisModel?.trim()) found.add("ANALYSIS_MODEL_MISSING");

  if (!item.analysisPromptVersion?.trim()) {
    found.add("ANALYSIS_PROMPT_VERSION_MISSING");
  } else if (!policy.supportedAnalysisPromptVersions.includes(item.analysisPromptVersion)) {
    found.add("ANALYSIS_PROMPT_VERSION_UNSUPPORTED");
  }

  const claims = item.keyClaims ?? [];
  if (claims.some((claim) => claim.evidenceRefs.some((reference) => !KNOWN_EVIDENCE_REFERENCES.has(reference)))) {
    found.add("EVIDENCE_REFERENCE_UNKNOWN");
  }

  const hasGroundedClaim = claims.some(
    (claim) => claim.claim.trim().length > 0 && claim.evidenceRefs.length > 0,
  );
  const hasInsufficiencyLimitation = (item.limitations ?? []).some(
    (limitation) => INSUFFICIENCY_PATTERN.test(limitation),
  );
  if (!hasGroundedClaim && !hasInsufficiencyLimitation) {
    found.add("CLAIM_OR_LIMITATION_REQUIRED");
  }

  const periodStart = timestamp(input.reportingPeriod.start);
  const periodEnd = timestamp(input.reportingPeriod.end);
  const cutoff = timestamp(input.cutoffAt);
  const reportingContextValid = periodStart !== null
    && periodEnd !== null
    && cutoff !== null
    && periodStart <= periodEnd
    && cutoff >= periodStart
    && cutoff <= periodEnd;

  if (!reportingContextValid) found.add("REPORTING_CONTEXT_INVALID");

  const itemTimestamp = timestamp(item.createdAt);
  if (itemTimestamp === null) {
    found.add("ITEM_TIMESTAMP_INVALID");
  } else {
    if (
      periodStart !== null
      && periodEnd !== null
      && periodStart <= periodEnd
      && (itemTimestamp < periodStart || itemTimestamp > periodEnd)
    ) {
      found.add("ITEM_OUTSIDE_REPORTING_INTERVAL");
    }
    if (cutoff !== null && itemTimestamp > cutoff + FUTURE_CLOCK_SKEW_MS) {
      found.add("ITEM_TIMESTAMP_TOO_FAR_IN_FUTURE");
    }
  }

  const reasonCodes = RANKING_ELIGIBILITY_CODES.filter((code) => found.has(code));
  return reasonCodes.length === 0
    ? { status: "eligible", reasonCodes: [] }
    : { status: "excluded", reasonCodes };
}
