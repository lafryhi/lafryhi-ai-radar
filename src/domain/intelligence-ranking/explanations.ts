import type { RankingAdjustment, RankingSignal } from "./contracts";

export const RANKING_EXPLANATION_TEMPLATES = {
  HIGH_IMPACT: "High expected impact materially increased editorial priority.",
  HIGH_RELEVANCE: "Strong relevance to the AI Radar mission increased editorial priority.",
  STRONG_CONFIDENCE: "Strong analysis confidence supported the ranking.",
  RECENT_PUBLICATION: "Recent publication increased the timeliness contribution.",
  SUFFICIENT_GROUNDED_EVIDENCE: "Grounded claims use the accepted source evidence.",
  OFFICIAL_SOURCE: "An official registered source contributed the bounded authority signal.",
  VERIFIED_SOURCE: "A verified registered source contributed the bounded authority signal.",
  LIMITED_EVIDENCE: "Limited grounded evidence reduced the evidence contribution.",
  MATERIAL_LIMITATIONS: "Multiple material limitations reduced the final score.",
  LOW_CONFIDENCE_CAP: "Low confidence capped the maximum final score.",
  MISSING_PUBLICATION_TIMESTAMP: "A missing publication timestamp reduced the final score.",
  FUTURE_TIMESTAMP: "A publication timestamp within clock-skew tolerance reduced the final score.",
  UNSUPPORTED_ANALYSIS_VERSION: "The analysis prompt version is unsupported by this ranking policy.",
  BLOCKED_SOURCE: "Blocked sources are excluded from ranking.",
  UNKNOWN_EVIDENCE: "Unknown evidence references are excluded from ranking.",
  FAILED_ANALYSIS: "Incomplete or failed analysis is excluded from ranking.",
} as const;

export type RankingExplanationCode = keyof typeof RANKING_EXPLANATION_TEMPLATES;

export function explanationForCode(code: string): string {
  return RANKING_EXPLANATION_TEMPLATES[
    code as RankingExplanationCode
  ] ?? `Ranking rule applied: ${code}.`;
}

function normalizedValue(signals: RankingSignal[], factor: RankingSignal["factor"]) {
  return signals.find((signal) => signal.factor === factor)?.normalizedValue ?? null;
}

export function generateRankingExplanationCodes(
  signals: RankingSignal[],
  adjustments: RankingAdjustment[],
  sourceTrustLevel: string,
): RankingExplanationCode[] {
  const codes: RankingExplanationCode[] = [];
  const add = (code: RankingExplanationCode) => {
    if (!codes.includes(code)) codes.push(code);
  };

  if ((normalizedValue(signals, "impact") ?? 0) >= 0.80) add("HIGH_IMPACT");
  if ((normalizedValue(signals, "relevance") ?? 0) >= 0.75) add("HIGH_RELEVANCE");
  if ((normalizedValue(signals, "confidence") ?? 0) >= 0.80) add("STRONG_CONFIDENCE");
  if ((normalizedValue(signals, "timeliness") ?? 0) >= 0.90) add("RECENT_PUBLICATION");
  if ((normalizedValue(signals, "evidenceSufficiency") ?? 0) >= 0.75) {
    add("SUFFICIENT_GROUNDED_EVIDENCE");
  } else {
    add("LIMITED_EVIDENCE");
  }
  if (sourceTrustLevel === "official") add("OFFICIAL_SOURCE");
  if (sourceTrustLevel === "verified") add("VERIFIED_SOURCE");

  for (const adjustment of adjustments) {
    if (adjustment.code in RANKING_EXPLANATION_TEMPLATES) {
      add(adjustment.code as RankingExplanationCode);
    }
  }

  return codes;
}

export function generateRankingExplanations(codes: string[]): string[] {
  return codes.map(explanationForCode);
}
