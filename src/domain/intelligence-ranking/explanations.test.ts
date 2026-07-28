import { describe, expect, it } from "vitest";
import { acceptanceInput } from "./acceptance-corpus.test-fixtures";
import {
  explanationForCode,
  generateRankingExplanationCodes,
  generateRankingExplanations,
} from "./explanations";
import { RANKING_POLICY_V1 } from "./policy";
import { scoreRankingInput } from "./scoring";

describe("ranking explanations", () => {
  it("generates stable codes in deterministic order", () => {
    const result = scoreRankingInput(acceptanceInput(), RANKING_POLICY_V1);
    expect(result.explanationCodes).toEqual([
      "HIGH_IMPACT",
      "HIGH_RELEVANCE",
      "STRONG_CONFIDENCE",
      "RECENT_PUBLICATION",
      "SUFFICIENT_GROUNDED_EVIDENCE",
      "OFFICIAL_SOURCE",
    ]);
    expect(result.whyRanked).toEqual(
      generateRankingExplanations(result.explanationCodes),
    );
  });

  it("includes deterministic adjustment explanations without duplicates", () => {
    const result = scoreRankingInput(acceptanceInput({
      confidenceScore: 30,
      limitations: ["Missing confirmation.", "Incomplete rollout."],
    }), RANKING_POLICY_V1);
    expect(result.explanationCodes).toContain("LOW_CONFIDENCE_CAP");
    expect(result.explanationCodes).toContain("MATERIAL_LIMITATIONS");
    expect(new Set(result.explanationCodes).size).toBe(result.explanationCodes.length);
  });

  it("uses templates rather than generated prose", () => {
    expect(explanationForCode("HIGH_IMPACT")).toBe(
      "High expected impact materially increased editorial priority.",
    );
    expect(explanationForCode("CUSTOM_POLICY_CODE")).toBe(
      "Ranking rule applied: CUSTOM_POLICY_CODE.",
    );
  });

  it("is deterministic when called directly", () => {
    const result = scoreRankingInput(acceptanceInput(), RANKING_POLICY_V1);
    const codes = generateRankingExplanationCodes(
      result.signals,
      result.adjustments,
      "official",
    );
    expect(codes).toEqual(result.explanationCodes);
  });
});
