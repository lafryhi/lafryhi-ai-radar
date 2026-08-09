import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { MemoryRepository } from "@/persistence/memory";
import {
  RadarItemSchema,
  ReviewDecisionSchema,
  SourceRecordSchema,
} from "@/domain/schemas";
import { sourceDefinitionFixture, sourceFixture } from "@/test/fixtures";
import { handlePublishedRadarExport } from "./published-radar-export-route";
import type { RadarExportIdentityVerifier } from "./published-radar-export";

const allowed: RadarExportIdentityVerifier = {
  async verify(value) {
    return value === "Bearer valid-service-identity";
  },
};

async function repositoryWithPublished() {
  const repository = new MemoryRepository();
  await repository.saveSourceDefinition(sourceDefinitionFixture());
  await repository.saveSource(
    SourceRecordSchema.parse({
      ...sourceFixture,
      sourceDefinitionId: "source-definition-1",
    }),
  );
  await repository.saveReview(
    ReviewDecisionSchema.parse({
      id: "review-1",
      analysisResultId: "analysis-1",
      status: "approved",
      reviewerNote: "Evidence checked",
      reviewedAt: "2026-08-03T12:00:00.000Z",
    }),
  );
  await repository.saveRadarItem(
    RadarItemSchema.parse({
      id: "radar-1",
      publicTitle: "Verified AI developer announcement",
      publicSummary:
        "A human-approved summary of a public AI developer announcement.",
      whyItMatters:
        "The public announcement can inform a bounded small-business technology decision.",
      recommendedAction:
        "Review the official source before starting a measured evaluation.",
      category: "developer_announcement",
      relevanceScore: 71,
      confidenceScore: 90,
      originalSourceUrl: sourceFixture.sourceUrl,
      sourceName: sourceFixture.sourceName,
      sourcePublishedAt: sourceFixture.publishedAt,
      publicationState: "published",
      sourceRecordId: sourceFixture.id,
      processingRunId: "run-1",
      analysisResultId: "analysis-1",
      reviewDecisionId: "review-1",
      publishedAt: "2026-08-03T12:00:00.000Z",
    }),
  );
  return repository;
}

function request(
  query = "topic=AI&maximumItemCount=3",
  headers: Record<string, string> = {},
) {
  return new NextRequest(
    `https://radar.example/api/internal/agent-services/published-radar-export?${query}`,
    { headers },
  );
}

describe("IAM-protected published Radar export", () => {
  afterEach(() => {
    delete process.env.OPERATOR_ACCESS_TOKEN;
    delete process.env.RSS_SCHEDULER_SECRET;
  });

  it("rejects missing credentials, operator tokens, and scheduler secrets", async () => {
    const repository = await repositoryWithPublished();
    process.env.OPERATOR_ACCESS_TOKEN = "operator-token-that-cannot-authorize";
    process.env.RSS_SCHEDULER_SECRET = "scheduler-secret-that-cannot-authorize";
    for (const authorization of [
      undefined,
      `Bearer ${process.env.OPERATOR_ACCESS_TOKEN}`,
      `Bearer ${process.env.RSS_SCHEDULER_SECRET}`,
    ]) {
      const response = await handlePublishedRadarExport(
        request("topic=AI", authorization ? { authorization } : {}),
        repository,
        allowed,
      );
      expect(response.status).toBe(401);
    }
  });

  it("returns only minimal approved, published, source-backed records to a valid service identity", async () => {
    const repository = await repositoryWithPublished();
    await repository.saveReview({
      id: "pending",
      analysisResultId: "pending-analysis",
      status: "pending",
      reviewerNote: "",
      reviewedAt: null,
    });
    await repository.saveReview({
      id: "rejected",
      analysisResultId: "rejected-analysis",
      status: "rejected",
      reviewerNote: "Rejected",
      reviewedAt: "2026-08-03T12:00:00.000Z",
    });
    const response = await handlePublishedRadarExport(
      request("topic=AI&maximumItemCount=5&language=en", {
        authorization: "Bearer valid-service-identity",
      }),
      repository,
      allowed,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      schemaVersion: "1.0.0",
      items: [
        {
          radarItemId: "radar-1",
          verificationStatus: "approved",
          humanReviewRequired: true,
          publiclyEligible: true,
          language: "en",
        },
      ],
    });
    expect(body.items).toHaveLength(1);
    expect(JSON.stringify(body)).not.toMatch(
      /reviewerNote|normalizedText|operator|prompt|diagnostic|token|secret/i,
    );
  });

  it("excludes items lacking linked approval, verification time, or source provenance", async () => {
    const repository = await repositoryWithPublished();
    await repository.saveReview({
      id: "review-1",
      analysisResultId: "analysis-1",
      status: "approved",
      reviewerNote: "",
      reviewedAt: null,
    });
    let response = await handlePublishedRadarExport(
      request("topic=AI", { authorization: "Bearer valid-service-identity" }),
      repository,
      allowed,
    );
    expect((await response.json()).items).toEqual([]);
    const missingSource = await repositoryWithPublished();
    const item = (await missingSource.listPublishedItems())[0]!;
    await missingSource.saveRadarItem({
      ...item,
      sourceRecordId: "missing-source",
    });
    response = await handlePublishedRadarExport(
      request("topic=AI", { authorization: "Bearer valid-service-identity" }),
      missingSource,
      allowed,
    );
    expect((await response.json()).items).toEqual([]);
  });

  it("excludes an unpublished repository result even if an adapter violates its contract", async () => {
    const repository = await repositoryWithPublished();
    const item = (await repository.listPublishedItems())[0]!;
    class UnsafeRepository extends MemoryRepository {
      override async listPublishedItems() {
        return [{ ...item, publicationState: "draft" }] as never;
      }
    }
    const response = await handlePublishedRadarExport(
      request("topic=AI", { authorization: "Bearer valid-service-identity" }),
      new UnsafeRepository(),
      allowed,
    );
    expect((await response.json()).items).toEqual([]);
  });

  it("enforces count limits and rejects malformed or arbitrary queries", async () => {
    const repository = await repositoryWithPublished();
    for (const query of [
      "topic=x",
      "topic=AI&maximumItemCount=6",
      "topic=AI&firestoreQuery=all",
    ]) {
      const response = await handlePublishedRadarExport(
        request(query, { authorization: "Bearer valid-service-identity" }),
        repository,
        allowed,
      );
      expect(response.status).toBe(400);
    }
  });
});
