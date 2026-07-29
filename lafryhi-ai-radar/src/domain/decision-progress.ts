import { z } from "zod";

const isoDateTime = z.string().datetime({ offset: true });
const optionalNote = z.string().trim().max(500).nullable();

export const DecisionUsefulnessSchema = z.enum(["USEFUL", "NOT_USEFUL"]);
export const DecisionActionStatusSchema = z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ABANDONED"]);
export const DecisionOutcomeSchema = z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE", "UNKNOWN"]);

export const DecisionFeedbackSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  decisionBriefId: z.string().uuid(),
  usefulness: DecisionUsefulnessSchema,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  schemaVersion: z.literal(1),
}).strict();

export const ActionStatusHistoryEntrySchema = z.object({
  from: DecisionActionStatusSchema,
  to: DecisionActionStatusSchema,
  changedAt: isoDateTime,
}).strict();

export const DecisionActionSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  decisionBriefId: z.string().uuid(),
  businessProfileId: z.string().uuid(),
  signalId: z.string().min(1),
  status: DecisionActionStatusSchema,
  actionNote: optionalNote,
  outcome: DecisionOutcomeSchema.nullable(),
  outcomeSummary: optionalNote,
  startedAt: isoDateTime.nullable(),
  completedAt: isoDateTime.nullable(),
  abandonedAt: isoDateTime.nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  statusHistory: z.array(ActionStatusHistoryEntrySchema).max(100),
  schemaVersion: z.literal(1),
}).strict();

export type DecisionUsefulness = z.infer<typeof DecisionUsefulnessSchema>;
export type DecisionActionStatus = z.infer<typeof DecisionActionStatusSchema>;
export type DecisionOutcome = z.infer<typeof DecisionOutcomeSchema>;
export type DecisionFeedback = z.infer<typeof DecisionFeedbackSchema>;
export type DecisionAction = z.infer<typeof DecisionActionSchema>;
