import { z } from "zod";

const SourceEventSchema = z.object({
  event: z.enum(["source.created", "source.updated", "source.enabled", "source.disabled", "source.blocked", "source.archived", "source.validation_failed", "source.registration_verified", "source.registration_rejected"]),
  sourceDefinitionId: z.string().min(1).optional(),
  publisher: z.string().min(2).max(120).optional(),
  canonicalDomain: z.string().min(3).optional(),
  feedUrlHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  trustLevel: z.enum(["official", "verified", "community", "experimental", "blocked"]).optional(),
  status: z.enum(["enabled", "disabled", "blocked", "archived"]).optional(),
  action: z.enum(["register"]).optional(),
  validationResult: z.enum(["passed", "rejected"]).optional(),
  previousStatus: z.enum(["enabled", "disabled", "blocked", "archived"]).optional(),
  resultingStatus: z.enum(["enabled", "disabled", "blocked", "archived"]).optional(),
  reason: z.enum(["not_registered", "not_enabled", "not_trusted", "archived", "invalid_url", "invalid_transition", "duplicate_domain", "duplicate_feed_url", "invalid_metadata"]).optional(),
  timestamp: z.string().datetime({ offset: true }),
}).strict();

export type SourceEvent = z.infer<typeof SourceEventSchema>;

export function logSourceEvent(input: Omit<SourceEvent, "timestamp">, level: "info" | "warn" = "info") {
  const event = SourceEventSchema.parse({ ...input, timestamp: new Date().toISOString() });
  console[level](JSON.stringify(event));
  return event;
}
