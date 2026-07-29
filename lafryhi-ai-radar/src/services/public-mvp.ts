import {
  BusinessProfileInputSchema,
  BusinessProfileSchema,
  PublicSignalSchema,
  StoredDecisionBriefSchema,
  type BusinessProfile,
  type BusinessProfileInput,
  type PublicSignal,
  type StoredDecisionBrief,
} from "@/domain/public-mvp";
import { BusinessContextSchema, type BusinessContext, type DecisionEngineResult } from "@/domain/decision-intelligence";
import type { SourceRecord } from "@/domain/schemas";
import type { RadarRepository } from "@/persistence/repository";
import { z } from "zod";

export class PublicMvpError extends Error {
  constructor(message: string, readonly code: "INVALID_INPUT" | "NOT_FOUND" | "FORBIDDEN" | "NOT_PUBLISHABLE") {
    super(message);
  }
}

export interface DecisionEngineRunner {
  run(source: SourceRecord, context: BusinessContext): Promise<{ result: DecisionEngineResult; model: string }>;
}

function businessProfilePayload(input: unknown) {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  return {
    businessName: value.businessName,
    industry: value.industry,
    companySize: value.companySize,
    aiMaturity: value.aiMaturity,
    businessGoals: value.businessGoals,
    currentTools: value.currentTools,
    budgetRange: value.budgetRange,
    riskTolerance: value.riskTolerance,
  };
}

export async function saveBusinessProfile(
  repository: RadarRepository,
  ownerId: string,
  input: unknown,
  now = new Date().toISOString(),
): Promise<BusinessProfile> {
  const parsed = BusinessProfileInputSchema.safeParse(businessProfilePayload(input));
  if (!parsed.success) throw new PublicMvpError(parsed.error.issues[0]?.message ?? "Invalid Business Profile.", "INVALID_INPUT");
  const existing = await repository.findBusinessProfileByOwner(ownerId);
  const profile = BusinessProfileSchema.parse({
    ...parsed.data,
    id: existing?.id ?? crypto.randomUUID(),
    ownerId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    schemaVersion: 1,
  });
  await repository.saveBusinessProfile(profile);
  return profile;
}

export async function getOwnedBusinessProfile(repository: RadarRepository, ownerId: string, id?: string) {
  const profile = id ? await repository.getBusinessProfile(id) : await repository.findBusinessProfileByOwner(ownerId);
  return profile?.ownerId === ownerId ? profile : null;
}

export async function listPublicSignals(repository: RadarRepository, limit = 50): Promise<PublicSignal[]> {
  const published = await repository.listPublishedItems(limit);
  const signals = await Promise.all(published.map(async (item) => {
    const source = await repository.getSource(item.sourceRecordId);
    if (!source || item.publicationState !== "published") return null;
    return PublicSignalSchema.parse({
      id: item.id,
      sourceRecordId: source.id,
      title: item.publicTitle,
      description: item.publicSummary,
      sourceName: item.sourceName,
      sourceUrl: item.originalSourceUrl,
      publishedAt: item.sourcePublishedAt,
      signalImportance: item.relevanceScore,
    });
  }));
  return signals.filter((signal): signal is PublicSignal => signal !== null);
}

export async function generateOwnedDecisionBrief(
  repository: RadarRepository,
  engine: DecisionEngineRunner,
  ownerId: string,
  businessProfileId: string,
  signalId: string,
  now = new Date().toISOString(),
  idempotencyKey?: string,
): Promise<StoredDecisionBrief> {
  const profile = await getOwnedBusinessProfile(repository, ownerId, businessProfileId);
  if (!profile) throw new PublicMvpError("Business Profile not found.", "NOT_FOUND");

  const item = await repository.getRadarItem(signalId);
  if (!item || item.publicationState !== "published") throw new PublicMvpError("Trusted Signal is not available.", "NOT_PUBLISHABLE");
  const source = await repository.getSource(item.sourceRecordId);
  if (!source) throw new PublicMvpError("Verified source provenance is unavailable.", "NOT_PUBLISHABLE");
  let decisionBriefId = crypto.randomUUID();
  if (idempotencyKey) {
    const parsedKey = z.string().uuid().safeParse(idempotencyKey);
    if (!parsedKey.success) throw new PublicMvpError("Invalid generation request.", "INVALID_INPUT");
    decisionBriefId = parsedKey.data;
    const existing = await repository.getDecisionBrief(decisionBriefId);
    if (existing) {
      if (existing.ownerId === ownerId && existing.businessProfileId === profile.id && existing.signalId === signalId) return existing;
      throw new PublicMvpError("Generation request conflicts with an existing Decision Brief.", "INVALID_INPUT");
    }
  }

  const businessContext = BusinessContextSchema.parse({
    industry: profile.industry,
    companySize: profile.companySize,
    aiMaturity: profile.aiMaturity,
    businessGoals: profile.businessGoals,
    currentTools: profile.currentTools,
    budgetRange: profile.budgetRange,
    riskTolerance: profile.riskTolerance,
  });
  const signalSnapshot = PublicSignalSchema.parse({
    id: item.id,
    sourceRecordId: source.id,
    title: item.publicTitle,
    description: item.publicSummary,
    sourceName: item.sourceName,
    sourceUrl: item.originalSourceUrl,
    publishedAt: item.sourcePublishedAt,
    signalImportance: item.relevanceScore,
  });
  const generated = await engine.run(source, businessContext);
  const stored = StoredDecisionBriefSchema.parse({
    id: decisionBriefId,
    ownerId,
    businessProfileId: profile.id,
    signalId: item.id,
    businessName: profile.businessName,
    businessContextSnapshot: businessContext,
    signalSnapshot,
    result: generated.result,
    createdAt: now,
    schemaVersion: 1,
  });
  await repository.saveDecisionBrief(stored);
  return stored;
}

export async function getOwnedDecisionBrief(repository: RadarRepository, ownerId: string, id: string) {
  const brief = await repository.getDecisionBrief(id);
  return brief?.ownerId === ownerId ? brief : null;
}

export async function listOwnedDecisionBriefs(repository: RadarRepository, ownerId: string, limit = 50) {
  return repository.listDecisionBriefsByOwner(ownerId, limit);
}

export type { BusinessProfileInput };
