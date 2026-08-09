import { timingSafeEqual } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import type { RadarRepository } from "@/persistence/repository";

export const PUBLISHED_RADAR_EXPORT_VERSION = "1.0.0";
export const MAX_EXPORT_ITEMS = 5;

const isoDateTime = z.string().datetime({ offset: true });
const language = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/);

export const PublishedRadarExportQuerySchema = z.strictObject({
  topic: z.string().trim().min(2).max(200),
  maximumItemCount: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_EXPORT_ITEMS)
    .default(3),
  language: language.optional(),
  freshnessHours: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 365)
    .optional(),
});

export const PublishedRadarExportItemSchema = z.strictObject({
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
        publishedAt: isoDateTime,
      }),
    )
    .min(1)
    .max(1),
  verificationStatus: z.literal("approved"),
  humanReviewRequired: z.literal(true),
  verificationTimestamp: isoDateTime,
  publiclyEligible: z.literal(true),
  relevance: z.number().int().min(0).max(100),
  confidence: z.number().int().min(0).max(100),
  publishedAt: isoDateTime,
  language: language.nullable(),
  publicUrl: z.string().url().nullable(),
});

export const PublishedRadarExportResponseSchema = z.strictObject({
  schemaVersion: z.literal(PUBLISHED_RADAR_EXPORT_VERSION),
  items: z.array(PublishedRadarExportItemSchema).max(MAX_EXPORT_ITEMS),
});

export type PublishedRadarExportQuery = z.infer<
  typeof PublishedRadarExportQuerySchema
>;

export interface RadarExportIdentityVerifier {
  verify(authorization: string | null): Promise<boolean>;
}

export class GoogleRadarExportIdentityVerifier implements RadarExportIdentityVerifier {
  constructor(private readonly client = new OAuth2Client()) {}

  async verify(authorization: string | null) {
    const token = bearer(authorization);
    const audience = process.env.RADAR_EXPORT_AUDIENCE?.trim();
    const expectedEmail =
      process.env.RADAR_EXPORT_SELLER_SERVICE_ACCOUNT?.trim().toLowerCase();
    if (!token || !audience || !expectedEmail) return localSecretAllowed(token);
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience,
      });
      const payload = ticket.getPayload();
      return (
        payload?.email_verified === true &&
        payload.email?.toLowerCase() === expectedEmail
      );
    } catch {
      return localSecretAllowed(token);
    }
  }
}

function bearer(value: string | null) {
  const match = value?.match(/^Bearer ([^\s]+)$/);
  return match?.[1] ?? null;
}

function localSecretAllowed(candidate: string | null) {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.RADAR_EXPORT_LOCAL_AUTH_ENABLED !== "true"
  )
    return false;
  const expected = process.env.RADAR_EXPORT_LOCAL_SECRET ?? "";
  if (!candidate || expected.length < 20) return false;
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function topicMatches(topic: string, values: string[]) {
  const terms = topic
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 2);
  const haystack = values.join(" ").toLowerCase();
  return terms.length > 0 && terms.some((term) => haystack.includes(term));
}

export async function exportPublishedRadarItems(
  repository: RadarRepository,
  query: PublishedRadarExportQuery,
  now = new Date(),
) {
  const candidates = await repository.listPublishedItems(25);
  const cutoff =
    query.freshnessHours === undefined
      ? null
      : now.getTime() - query.freshnessHours * 3_600_000;
  const exported = await Promise.all(
    candidates.map(async (candidate) => {
      const source = await repository.getSource(candidate.sourceRecordId);
      const review = await repository.getReviewForAnalysis(
        candidate.analysisResultId,
      );
      if (
        !source ||
        !review ||
        review.id !== candidate.reviewDecisionId ||
        review.status !== "approved" ||
        !review.reviewedAt
      )
        return null;
      if (
        candidate.publicationState !== "published" ||
        !candidate.originalSourceUrl ||
        !candidate.publishedAt
      )
        return null;
      if (cutoff !== null && Date.parse(candidate.publishedAt) < cutoff)
        return null;
      const sourceDefinition = source.sourceDefinitionId
        ? await repository.getSourceDefinition(source.sourceDefinitionId)
        : null;
      const itemLanguage = sourceDefinition?.language ?? null;
      if (query.language && itemLanguage !== query.language) return null;
      if (
        !topicMatches(query.topic, [
          candidate.publicTitle,
          candidate.publicSummary,
          candidate.whyItMatters,
          candidate.category,
        ])
      )
        return null;
      return PublishedRadarExportItemSchema.parse({
        radarItemId: candidate.id,
        title: candidate.publicTitle,
        summary: candidate.publicSummary,
        whyItMatters: candidate.whyItMatters,
        recommendedAction: candidate.recommendedAction,
        category: candidate.category,
        sourceReferences: [
          {
            title: source.title,
            url: candidate.originalSourceUrl,
            publishedAt: source.publishedAt,
          },
        ],
        verificationStatus: "approved",
        humanReviewRequired: true,
        verificationTimestamp: review.reviewedAt,
        publiclyEligible: true,
        relevance: candidate.relevanceScore,
        confidence: candidate.confidenceScore,
        publishedAt: candidate.publishedAt,
        language: itemLanguage,
        publicUrl: null,
      });
    }),
  );
  return PublishedRadarExportResponseSchema.parse({
    schemaVersion: PUBLISHED_RADAR_EXPORT_VERSION,
    items: exported
      .filter((item) => item !== null)
      .slice(0, query.maximumItemCount),
  });
}
