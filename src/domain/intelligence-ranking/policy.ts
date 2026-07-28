import type { RankingPolicy } from "./contracts";
import { RankingPolicySchema } from "./schemas";

export const RANKING_POLICY_V1: RankingPolicy = RankingPolicySchema.parse({
  version: "ranking-policy-v1",
  algorithmVersion: "deterministic-ranking-v1",
  supportedAnalysisPromptVersions: ["live-analysis-v1"],
  weights: {
    impact: 0.30,
    relevance: 0.25,
    confidence: 0.20,
    timeliness: 0.10,
    evidenceSufficiency: 0.10,
    sourceAuthority: 0.05,
  },
  rankBandThresholds: {
    critical: 85,
    high: 70,
    medium: 50,
    low: 30,
  },
  sourceAuthority: {
    official: 1.00,
    verified: 0.80,
    community: 0.50,
    experimental: 0.20,
    blocked: null,
  },
  confidenceCaps: [
    { below: 0.40, maximumFinalScore: 49.99 },
    { below: 0.60, maximumFinalScore: 69.99 },
  ],
});

export function getRankingPolicy(version: string): RankingPolicy {
  if (version === RANKING_POLICY_V1.version) return RANKING_POLICY_V1;
  throw new Error(`Unsupported ranking policy version: ${version}`);
}
