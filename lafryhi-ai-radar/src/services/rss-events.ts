import { z } from "zod";

const RssEventSchema = z.object({
  event: z.enum(["rss.discovery_started", "rss.discovery_completed", "rss.source_started", "rss.source_completed", "rss.source_skipped", "rss.feed_validation_failed", "rss.feed_fetch_failed", "rss.feed_parse_failed", "rss.item_rejected", "rss.item_duplicate", "rss.item_accepted", "rss.schedule_unauthorized"]),
  runId: z.string().min(1).optional(),
  sourceDefinitionId: z.string().min(1).optional(),
  candidateId: z.string().min(1).optional(),
  trigger: z.enum(["manual", "scheduled"]).optional(),
  status: z.enum(["running", "success", "partial", "failed", "skipped"]).optional(),
  reason: z.enum(["ineligible_source", "missing_feed", "unsafe_url", "fetch_failed", "unsupported_content", "oversized_feed", "malformed_feed", "outside_domain", "duplicate_url", "duplicate_feed_id", "bounded_limit", "unauthorized"]).optional(),
  sourcesConsidered: z.number().int().nonnegative().max(10).optional(),
  itemsExamined: z.number().int().nonnegative().max(500).optional(),
  candidatesAccepted: z.number().int().nonnegative().max(25).optional(),
  duplicates: z.number().int().nonnegative().max(500).optional(),
  skippedItems: z.number().int().nonnegative().max(500).optional(),
  validationFailures: z.number().int().nonnegative().max(500).optional(),
  timestamp: z.string().datetime({ offset: true }),
}).strict();

export type RssEvent = z.infer<typeof RssEventSchema>;

export function logRssEvent(input: Omit<RssEvent, "timestamp">, level: "info" | "warn" = "info") {
  const event = RssEventSchema.parse({ ...input, timestamp: new Date().toISOString() });
  console[level](JSON.stringify(event));
  return event;
}
