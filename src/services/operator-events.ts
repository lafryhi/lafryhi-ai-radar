import { z } from "zod";

const OperatorEventSchema = z.object({
  event: z.enum([
    "operator.dashboard_viewed",
    "operator.review_opened",
    "operator.review_approved",
    "operator.review_rejected",
    "operator.review_conflict",
    "operator.action_failed",
  ]),
  reviewId: z.string().min(1).optional(),
  analysisId: z.string().min(1).optional(),
  sourceId: z.string().min(1).optional(),
  runId: z.string().min(1).optional(),
  radarItemId: z.string().min(1).optional(),
  previousStatus: z.enum(["pending", "approved", "rejected", "needs_changes"]).optional(),
  resultingStatus: z.enum(["pending", "approved", "rejected", "needs_changes"]).optional(),
  action: z.enum(["view_dashboard", "open_review", "approve", "reject"]).optional(),
  reason: z.enum(["invalid_transition", "not_found", "invalid_request", "persistence_failure"]).optional(),
  timestamp: z.string().datetime({ offset: true }),
}).strict();

export type OperatorEvent = z.infer<typeof OperatorEventSchema>;

export function logOperatorEvent(input: Omit<OperatorEvent, "timestamp">, level: "info" | "warn" = "info") {
  const event = OperatorEventSchema.parse({ ...input, timestamp: new Date().toISOString() });
  console[level](JSON.stringify(event));
  return event;
}
