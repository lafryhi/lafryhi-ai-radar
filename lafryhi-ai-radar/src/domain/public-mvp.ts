import { z } from "zod";
import { BusinessContextSchema, DecisionEngineResultSchema } from "./decision-intelligence";

const isoDateTime = z.string().datetime({ offset: true });

export const BusinessProfileInputSchema = BusinessContextSchema.extend({
  businessName: z.string().trim().min(2).max(160),
}).strict();

export const BusinessProfileSchema = BusinessProfileInputSchema.extend({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  schemaVersion: z.literal(1),
}).strict();

export const PublicSignalSchema = z.object({
  id: z.string().min(1),
  sourceRecordId: z.string().min(1),
  title: z.string().min(1).max(300),
  description: z.string().min(20).max(800),
  sourceName: z.string().min(1).max(200),
  sourceUrl: z.string().url(),
  publishedAt: isoDateTime,
  signalImportance: z.number().int().min(0).max(100),
}).strict();

export const StoredDecisionBriefSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  businessProfileId: z.string().uuid(),
  signalId: z.string().min(1),
  businessName: z.string().min(2).max(160),
  businessContextSnapshot: BusinessContextSchema,
  signalSnapshot: PublicSignalSchema,
  result: DecisionEngineResultSchema,
  createdAt: isoDateTime,
  schemaVersion: z.literal(1),
}).strict();

export type BusinessProfileInput = z.infer<typeof BusinessProfileInputSchema>;
export type BusinessProfile = z.infer<typeof BusinessProfileSchema>;
export type PublicSignal = z.infer<typeof PublicSignalSchema>;
export type StoredDecisionBrief = z.infer<typeof StoredDecisionBriefSchema>;
