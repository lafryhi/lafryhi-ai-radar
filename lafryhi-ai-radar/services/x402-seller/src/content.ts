import {
  PublicVerifiedItemSchema,
  type DecisionBriefRequest,
  type PublicVerifiedItem,
} from "./contracts.js";
import type { VerifiedRadarContentPort } from "./ports.js";

export const APPROVED_DEMO_FIXTURES: PublicVerifiedItem[] = [
  PublicVerifiedItemSchema.parse({
    id: "demo-approved-ai-adoption-001",
    topicTags: ["ai", "small business", "adoption", "automation"],
    verifiedTitle:
      "Approved demo: small-business AI adoption requires measured workflow selection",
    verifiedSummary:
      "A labeled demonstration record showing how verified public signals can support a bounded decision brief. It is not live market intelligence.",
    verifiedSignals: [
      "Start with measurable, reversible workflows.",
      "Keep accountable human review for consequential outputs.",
    ],
    sourceReferences: [
      {
        title: "LAFRYHI approved demonstration fixture",
        url: "https://example.com/lafryhi-approved-demo-fixture",
        publishedAt: null,
      },
    ],
    publicationStatus: "published",
    reviewStatus: "approved",
    humanReviewRequired: true,
    verificationTimestamp: "2026-08-03T00:00:00.000Z",
    publiclyEligible: true,
    businessImpact: [
      "A bounded pilot can reveal value before wider operational commitment.",
    ],
    risks: [
      "Unmeasured automation may shift rather than remove operational cost.",
    ],
    opportunities: ["Prioritize repetitive tasks with observable outcomes."],
    recommendations: [
      "Define one workflow, owner, baseline, and stop condition.",
    ],
    confidence: 0.82,
  }),
];

function matches(item: PublicVerifiedItem, topic: string) {
  const words = topic
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 2);
  const haystack = [item.verifiedTitle, item.verifiedSummary, ...item.topicTags]
    .join(" ")
    .toLowerCase();
  return words.some((word) => haystack.includes(word));
}

export class FixtureRadarContentAdapter implements VerifiedRadarContentPort {
  constructor(private readonly items = APPROVED_DEMO_FIXTURES) {}
  async findVerified(request: DecisionBriefRequest) {
    return this.items
      .map((item) => PublicVerifiedItemSchema.safeParse(item))
      .filter((result) => result.success)
      .map((result) => result.data)
      .filter((item) => matches(item, request.topic))
      .slice(0, request.maximumItemCount);
  }
}

export class HttpRadarContentAdapter implements VerifiedRadarContentPort {
  constructor(
    private readonly endpoint: string,
    private readonly audience: string,
    private readonly localToken?: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}
  async findVerified(
    request: DecisionBriefRequest,
  ): Promise<PublicVerifiedItem[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
        "x-radar-export-contract": "1.0.0",
      };
      if (this.localToken) headers.authorization = `Bearer ${this.localToken}`;
      // On Cloud Run, an audience-bound Google identity token must be supplied by the runtime integration.
      headers["x-expected-audience"] = this.audience;
      const response = await this.fetcher(this.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          topic: request.topic,
          maximumItemCount: request.maximumItemCount,
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Radar export unavailable");
      const body: unknown = await response.json();
      const parsed = PublicVerifiedItemSchema.array().max(5).safeParse(body);
      if (!parsed.success) throw new Error("Radar export contract rejected");
      return parsed.data;
    } finally {
      clearTimeout(timer);
    }
  }
}
