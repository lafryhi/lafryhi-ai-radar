import { z } from "zod";
import { DecisionActionStatusSchema, DecisionOutcomeSchema } from "./decision-progress";
import { DecisionPositionSchema } from "./decision-intelligence";

const count = z.number().int().nonnegative();
export const RateMetricSchema = z.object({
  numerator: count,
  denominator: count,
  value: z.number().min(0).nullable(),
}).strict();

export const DecisionTimelineEventSchema = z.object({
  type: z.enum(["DECISION_CREATED", "FEEDBACK_SUBMITTED", "FEEDBACK_UPDATED", "ACTION_STARTED", "ACTION_COMPLETED", "ACTION_ABANDONED", "ACTION_RESUMED", "ACTION_REOPENED", "OUTCOME_RECORDED"]),
  decisionBriefId: z.string().uuid(),
  title: z.string().min(1).max(500),
  timestamp: z.string().datetime({ offset: true }),
  position: DecisionPositionSchema.nullable(),
  actionStatus: DecisionActionStatusSchema,
  outcome: DecisionOutcomeSchema.nullable(),
}).strict();

const commonRates = {
  actionStartRate: RateMetricSchema,
  actionCompletionRate: RateMetricSchema,
  usefulnessRate: RateMetricSchema,
  positiveOutcomeRate: RateMetricSchema,
};

export const UserImpactMetricsSchema = z.object({
  businessProfiles: count,
  totalDecisionBriefs: count,
  usefulDecisionBriefs: count,
  notUsefulDecisionBriefs: count,
  notRatedDecisionBriefs: count,
  actionsNotStarted: count,
  actionsInProgress: count,
  actionsCompleted: count,
  actionsAbandoned: count,
  positiveOutcomes: count,
  neutralOutcomes: count,
  negativeOutcomes: count,
  unknownOutcomes: count,
  averageDecisionScore: z.number().min(0).max(100).nullable(),
  ...commonRates,
  timeline: z.array(DecisionTimelineEventSchema),
}).strict();

const BreakdownRatesSchema = z.object(commonRates).strict();
export const IndustryAnalyticsSchema = BreakdownRatesSchema.extend({
  industry: z.string().min(1).max(160),
  businessProfiles: count,
  decisionBriefs: count,
}).strict();
export const DecisionPositionAnalyticsSchema = BreakdownRatesSchema.extend({
  position: DecisionPositionSchema,
  count,
  percentage: RateMetricSchema,
}).strict();
export const ActionStatusAnalyticsSchema = z.object({ status: DecisionActionStatusSchema, count, percentage: RateMetricSchema }).strict();
export const OutcomeAnalyticsSchema = z.object({ outcome: DecisionOutcomeSchema, count, percentage: RateMetricSchema }).strict();
export const SignalAnalyticsSchema = z.object({
  signalId: z.string().min(1),
  title: z.string().min(1).max(300),
  decisionBriefs: count,
  averageDecisionScore: z.number().min(0).max(100).nullable(),
  usefulnessRate: RateMetricSchema,
  actionStartRate: RateMetricSchema,
  actionCompletionRate: RateMetricSchema,
}).strict();
export const FunnelStageSchema = z.object({
  label: z.string().min(1),
  count,
  fromPrevious: RateMetricSchema.nullable(),
  fromDecisionBriefs: RateMetricSchema.nullable(),
}).strict();

export const OperatorProductMetricsSchema = z.object({
  totalBusinessProfiles: count,
  totalAnonymousOwners: count,
  totalDecisionBriefs: count,
  readyDecisionBriefs: count,
  insufficientEvidenceBriefs: count,
  totalUsefulnessRatings: count,
  totalActionRecords: count,
  activeIndustries: count,
  publishedSignalsUsed: count,
  averageDecisionScore: z.number().min(0).max(100).nullable(),
  medianDecisionScore: z.number().min(0).max(100).nullable(),
  usefulRate: RateMetricSchema,
  actionStartRate: RateMetricSchema,
  actionCompletionRate: RateMetricSchema,
  actionAbandonmentRate: RateMetricSchema,
  positiveOutcomeRate: RateMetricSchema,
  insufficientEvidenceRate: RateMetricSchema,
  industries: z.array(IndustryAnalyticsSchema),
  positions: z.array(DecisionPositionAnalyticsSchema),
  actionStatuses: z.array(ActionStatusAnalyticsSchema),
  outcomes: z.array(OutcomeAnalyticsSchema),
  signals: z.array(SignalAnalyticsSchema),
  funnel: z.array(FunnelStageSchema),
}).strict();

export type RateMetric = z.infer<typeof RateMetricSchema>;
export type UserImpactMetrics = z.infer<typeof UserImpactMetricsSchema>;
export type OperatorProductMetrics = z.infer<typeof OperatorProductMetricsSchema>;
export type DecisionTimelineEvent = z.infer<typeof DecisionTimelineEventSchema>;
