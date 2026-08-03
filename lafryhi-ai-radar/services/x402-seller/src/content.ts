import { z } from "zod";
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

const ExportItemSchema = z.strictObject({
  radarItemId: z.string().min(1).max(128),
  title: z.string().min(1).max(300),
  summary: z.string().min(20).max(800),
  whyItMatters: z.string().min(20).max(1_000),
  recommendedAction: z.string().min(10).max(800),
  category: z.string().min(1).max(80),
  sourceReferences: z
    .array(
      z.strictObject({
        title: z.string().min(1).max(300),
        url: z.string().url().max(2_048),
        publishedAt: z.string().datetime(),
      }),
    )
    .min(1)
    .max(1),
  verificationStatus: z.literal("approved"),
  humanReviewRequired: z.literal(true),
  verificationTimestamp: z.string().datetime(),
  publiclyEligible: z.literal(true),
  relevance: z.number().int().min(0).max(100),
  confidence: z.number().int().min(0).max(100),
  publishedAt: z.string().datetime(),
  language: z.string().nullable(),
  publicUrl: z.string().url().nullable(),
});
const ExportResponseSchema = z.strictObject({
  schemaVersion: z.literal("1.0.0"),
  items: z.array(ExportItemSchema).max(5),
});

export interface RadarExportTokenProvider {
  token(audience: string): Promise<string>;
}

export class StaticDevelopmentTokenProvider implements RadarExportTokenProvider {
  constructor(private readonly value: string) {}
  async token() {
    if (process.env.NODE_ENV === "production" || this.value.length < 20)
      throw new Error("Development Radar export authorization is unavailable");
    return this.value;
  }
}

export class GoogleMetadataIdentityTokenProvider implements RadarExportTokenProvider {
  constructor(private readonly fetcher: typeof fetch = fetch) {}
  async token(audience: string) {
    const url = new URL(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity",
    );
    url.searchParams.set("audience", audience);
    url.searchParams.set("format", "full");
    const response = await this.fetcher(url, {
      headers: { "Metadata-Flavor": "Google" },
      redirect: "error",
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) throw new Error("Radar export identity unavailable");
    const token = (await response.text()).trim();
    if (!token) throw new Error("Radar export identity unavailable");
    return token;
  }
}

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
  constructor(private readonly items = APPROVED_DEMO_FIXTURES) {
    if (process.env.NODE_ENV === "production")
      throw new Error("Fixture Radar content is prohibited in production");
  }
  async findVerified(request: DecisionBriefRequest) {
    return this.items
      .map((item) => PublicVerifiedItemSchema.safeParse(item))
      .filter((result) => result.success)
      .map((result) => result.data)
      .filter((item) => matches(item, request.topic))
      .slice(0, request.maximumItemCount);
  }
}

export interface HttpRadarContentOptions {
  endpoint: string;
  audience: string;
  tokenProvider: RadarExportTokenProvider;
  timeoutMs?: number;
  maximumResponseBytes?: number;
  fetcher?: typeof fetch;
}

export class HttpRadarContentAdapter implements VerifiedRadarContentPort {
  private readonly endpoint: URL;
  constructor(private readonly options: HttpRadarContentOptions) {
    this.endpoint = new URL(options.endpoint);
    if (
      process.env.NODE_ENV === "production" &&
      this.endpoint.protocol !== "https:"
    )
      throw new Error("Production Radar export URL must use HTTPS");
    if (
      this.endpoint.username ||
      this.endpoint.password ||
      this.endpoint.search ||
      this.endpoint.hash
    )
      throw new Error(
        "Radar export URL must not contain credentials, query, or fragment",
      );
  }

  async findVerified(
    request: DecisionBriefRequest,
  ): Promise<PublicVerifiedItem[]> {
    const token = await this.options.tokenProvider.token(this.options.audience);
    const url = new URL(this.endpoint);
    url.searchParams.set("topic", request.topic);
    url.searchParams.set("maximumItemCount", String(request.maximumItemCount));
    url.searchParams.set("language", request.targetLanguage);
    let response: Response | null = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        response = await (this.options.fetcher ?? fetch)(url, {
          method: "GET",
          headers: {
            authorization: `Bearer ${token}`,
            "x-radar-export-contract": "1.0.0",
          },
          redirect: "error",
          signal: AbortSignal.timeout(this.options.timeoutMs ?? 8_000),
        });
      } catch (error) {
        if (attempt === 1)
          throw new Error("Radar export unavailable", { cause: error });
        continue;
      }
      if (![502, 503, 504].includes(response.status) || attempt === 1) break;
    }
    if (!response?.ok) throw new Error("Radar export unavailable");
    const length = Number(response.headers.get("content-length") ?? "0");
    const maximum = this.options.maximumResponseBytes ?? 64_000;
    if (length > maximum) throw new Error("Radar export response too large");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maximum)
      throw new Error("Radar export response too large");
    let body: unknown;
    try {
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new Error("Radar export contract rejected");
    }
    const parsed = ExportResponseSchema.safeParse(body);
    if (!parsed.success) throw new Error("Radar export contract rejected");
    return parsed.data.items.map((item) =>
      PublicVerifiedItemSchema.parse({
        id: item.radarItemId,
        topicTags: [item.category],
        verifiedTitle: item.title,
        verifiedSummary: item.summary,
        verifiedSignals: [item.whyItMatters],
        sourceReferences: item.sourceReferences,
        publicationStatus: "published",
        reviewStatus: item.verificationStatus,
        humanReviewRequired: item.humanReviewRequired,
        verificationTimestamp: item.verificationTimestamp,
        publiclyEligible: item.publiclyEligible,
        businessImpact: [item.whyItMatters],
        risks: [],
        opportunities: [],
        recommendations: [item.recommendedAction],
        confidence: item.confidence / 100,
      }),
    );
  }
}
