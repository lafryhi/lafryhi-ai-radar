import {
  OperatorProductMetricsSchema,
  RateMetricSchema,
  UserImpactMetricsSchema,
  type DecisionTimelineEvent,
  type OperatorProductMetrics,
  type RateMetric,
  type UserImpactMetrics,
} from "@/domain/analytics";
import type { DecisionAction, DecisionActionStatus, DecisionFeedback } from "@/domain/decision-progress";
import type { StoredDecisionBrief } from "@/domain/public-mvp";
import type { RadarRepository } from "@/persistence/repository";

const positions = ["ACT_NOW", "RUN_EXPERIMENT", "MONITOR", "DEFER", "IGNORE", "AVOID"] as const;
const statuses = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ABANDONED"] as const;
const outcomes = ["POSITIVE", "NEUTRAL", "NEGATIVE", "UNKNOWN"] as const;

export function rate(numerator: number, denominator: number): RateMetric {
  return RateMetricSchema.parse({ numerator, denominator, value: denominator === 0 ? null : numerator / denominator });
}

export function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

export function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function everEntered(action: DecisionAction | undefined, status: DecisionActionStatus) {
  return Boolean(action?.status === status || action?.statusHistory.some((entry) => entry.to === status));
}

function indexes(feedback: DecisionFeedback[], actions: DecisionAction[]) {
  return {
    feedback: new Map(feedback.map((item) => [item.decisionBriefId, item])),
    actions: new Map(actions.map((item) => [item.decisionBriefId, item])),
  };
}

function metricsFor(briefs: StoredDecisionBrief[], feedback: DecisionFeedback[], actions: DecisionAction[]) {
  const index = indexes(feedback, actions);
  const rated = briefs.map((brief) => index.feedback.get(brief.id)).filter((item): item is DecisionFeedback => Boolean(item));
  const relatedActions = briefs.map((brief) => index.actions.get(brief.id)).filter((item): item is DecisionAction => Boolean(item));
  const actionableIds = new Set(briefs.filter((brief) => brief.result.status === "READY").map((brief) => brief.id));
  const actionableActions = relatedActions.filter((action) => actionableIds.has(action.decisionBriefId));
  const started = actionableActions.filter((action) => everEntered(action, "IN_PROGRESS"));
  const completed = relatedActions.filter((action) => everEntered(action, "COMPLETED"));
  const abandoned = actionableActions.filter((action) => everEntered(action, "ABANDONED"));
  const recordedOutcomes = relatedActions.filter((action) => action.outcome !== null);
  return {
    actionStartRate: rate(started.length, actionableIds.size),
    actionCompletionRate: rate(completed.filter((action) => actionableIds.has(action.decisionBriefId)).length, started.length),
    usefulnessRate: rate(rated.filter((item) => item.usefulness === "USEFUL").length, rated.length),
    positiveOutcomeRate: rate(recordedOutcomes.filter((item) => item.outcome === "POSITIVE").length, recordedOutcomes.length),
    abandoned,
  };
}

function titleFor(brief: StoredDecisionBrief) {
  return brief.result.status === "READY" ? brief.result.decisionBrief.decisionQuestion : brief.signalSnapshot.title;
}

function positionFor(brief: StoredDecisionBrief) {
  return brief.result.status === "READY" ? brief.result.decisionBrief.recommendedPosition : null;
}

export function buildDecisionTimeline(briefs: StoredDecisionBrief[], feedback: DecisionFeedback[], actions: DecisionAction[]): DecisionTimelineEvent[] {
  const briefMap = new Map(briefs.map((brief) => [brief.id, brief]));
  const actionMap = new Map(actions.map((action) => [action.decisionBriefId, action]));
  const events: DecisionTimelineEvent[] = briefs.map((brief) => ({
    type: "DECISION_CREATED",
    decisionBriefId: brief.id,
    title: titleFor(brief),
    timestamp: brief.createdAt,
    position: positionFor(brief),
    actionStatus: actionMap.get(brief.id)?.status ?? "NOT_STARTED",
    outcome: actionMap.get(brief.id)?.outcome ?? null,
  }));
  for (const item of feedback) {
    const brief = briefMap.get(item.decisionBriefId);
    if (!brief) continue;
    events.push({ type: "FEEDBACK_SUBMITTED", decisionBriefId: brief.id, title: titleFor(brief), timestamp: item.createdAt, position: positionFor(brief), actionStatus: actionMap.get(brief.id)?.status ?? "NOT_STARTED", outcome: actionMap.get(brief.id)?.outcome ?? null });
    if (item.updatedAt !== item.createdAt) events.push({ type: "FEEDBACK_UPDATED", decisionBriefId: brief.id, title: titleFor(brief), timestamp: item.updatedAt, position: positionFor(brief), actionStatus: actionMap.get(brief.id)?.status ?? "NOT_STARTED", outcome: actionMap.get(brief.id)?.outcome ?? null });
  }
  for (const action of actions) {
    const brief = briefMap.get(action.decisionBriefId);
    if (!brief) continue;
    for (const change of action.statusHistory) {
      const type = change.to === "COMPLETED" ? "ACTION_COMPLETED"
        : change.to === "ABANDONED" ? "ACTION_ABANDONED"
        : change.from === "ABANDONED" ? "ACTION_RESUMED"
        : change.from === "COMPLETED" ? "ACTION_REOPENED"
        : "ACTION_STARTED";
      events.push({ type, decisionBriefId: brief.id, title: titleFor(brief), timestamp: change.changedAt, position: positionFor(brief), actionStatus: action.status, outcome: action.outcome });
    }
    if (action.outcome) events.push({ type: "OUTCOME_RECORDED", decisionBriefId: brief.id, title: titleFor(brief), timestamp: action.completedAt ?? action.updatedAt, position: positionFor(brief), actionStatus: action.status, outcome: action.outcome });
  }
  return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export async function getUserImpactMetrics(repository: RadarRepository, ownerId: string): Promise<UserImpactMetrics> {
  const [profiles, briefs, feedback, actions] = await Promise.all([
    repository.listBusinessProfilesByOwner(ownerId, 1_000),
    repository.listDecisionBriefsByOwner(ownerId, 10_000),
    repository.listDecisionFeedbackByOwner(ownerId, 10_000),
    repository.listDecisionActionsByOwner(ownerId, 10_000),
  ]);
  const validBriefIds = new Set(briefs.map((brief) => brief.id));
  const ownedFeedback = feedback.filter((item) => item.ownerId === ownerId && validBriefIds.has(item.decisionBriefId));
  const ownedActions = actions.filter((item) => item.ownerId === ownerId && validBriefIds.has(item.decisionBriefId));
  const index = indexes(ownedFeedback, ownedActions);
  const scores = briefs.flatMap((brief) => brief.result.status === "READY" ? [brief.result.decisionBrief.score.decisionScore] : []);
  const common = metricsFor(briefs, ownedFeedback, ownedActions);
  return UserImpactMetricsSchema.parse({
    businessProfiles: profiles.filter((profile) => profile.ownerId === ownerId).length,
    totalDecisionBriefs: briefs.length,
    usefulDecisionBriefs: ownedFeedback.filter((item) => item.usefulness === "USEFUL").length,
    notUsefulDecisionBriefs: ownedFeedback.filter((item) => item.usefulness === "NOT_USEFUL").length,
    notRatedDecisionBriefs: briefs.filter((brief) => !index.feedback.has(brief.id)).length,
    actionsNotStarted: briefs.filter((brief) => !index.actions.has(brief.id)).length,
    actionsInProgress: ownedActions.filter((item) => item.status === "IN_PROGRESS").length,
    actionsCompleted: ownedActions.filter((item) => item.status === "COMPLETED").length,
    actionsAbandoned: ownedActions.filter((item) => item.status === "ABANDONED").length,
    positiveOutcomes: ownedActions.filter((item) => item.outcome === "POSITIVE").length,
    neutralOutcomes: ownedActions.filter((item) => item.outcome === "NEUTRAL").length,
    negativeOutcomes: ownedActions.filter((item) => item.outcome === "NEGATIVE").length,
    unknownOutcomes: ownedActions.filter((item) => item.outcome === "UNKNOWN").length,
    averageDecisionScore: average(scores),
    actionStartRate: common.actionStartRate,
    actionCompletionRate: common.actionCompletionRate,
    usefulnessRate: common.usefulnessRate,
    positiveOutcomeRate: common.positiveOutcomeRate,
    timeline: buildDecisionTimeline(briefs, ownedFeedback, ownedActions),
  });
}

function breakdownRates(briefs: StoredDecisionBrief[], feedback: DecisionFeedback[], actions: DecisionAction[]) {
  const common = metricsFor(briefs, feedback, actions);
  return {
    actionStartRate: common.actionStartRate,
    actionCompletionRate: common.actionCompletionRate,
    usefulnessRate: common.usefulnessRate,
    positiveOutcomeRate: common.positiveOutcomeRate,
  };
}

export async function getOperatorProductMetrics(repository: RadarRepository): Promise<OperatorProductMetrics> {
  const [profiles, briefs, feedback, actions] = await Promise.all([
    repository.listAllBusinessProfiles(),
    repository.listAllDecisionBriefs(),
    repository.listAllDecisionFeedback(),
    repository.listAllDecisionActions(),
  ]);
  const briefIds = new Set(briefs.map((brief) => brief.id));
  const validFeedback = feedback.filter((item) => briefIds.has(item.decisionBriefId));
  const validActions = actions.filter((item) => briefIds.has(item.decisionBriefId));
  const ready = briefs.filter((brief) => brief.result.status === "READY");
  const scores = ready.map((brief) => brief.result.status === "READY" ? brief.result.decisionBrief.score.decisionScore : 0);
  const common = metricsFor(briefs, validFeedback, validActions);
  const actionIndex = new Map(validActions.map((item) => [item.decisionBriefId, item]));
  const industries = [...new Set(profiles.map((profile) => profile.industry))].sort().map((industry) => {
    const industryProfiles = profiles.filter((profile) => profile.industry === industry);
    const industryBriefs = briefs.filter((brief) => brief.businessContextSnapshot.industry === industry);
    return { industry, businessProfiles: industryProfiles.length, decisionBriefs: industryBriefs.length, ...breakdownRates(industryBriefs, validFeedback, validActions) };
  });
  const positionRows = positions.map((position) => {
    const selected = ready.filter((brief) => brief.result.status === "READY" && brief.result.decisionBrief.recommendedPosition === position);
    return { position, count: selected.length, percentage: rate(selected.length, ready.length), ...breakdownRates(selected, validFeedback, validActions) };
  });
  const statusRows = statuses.map((status) => {
    const count = briefs.filter((brief) => (actionIndex.get(brief.id)?.status ?? "NOT_STARTED") === status).length;
    return { status, count, percentage: rate(count, briefs.length) };
  });
  const recorded = validActions.filter((action) => action.outcome !== null);
  const outcomeRows = outcomes.map((outcome) => {
    const count = recorded.filter((action) => action.outcome === outcome).length;
    return { outcome, count, percentage: rate(count, recorded.length) };
  });
  const signalRows = [...new Set(briefs.map((brief) => brief.signalId))].map((signalId) => {
    const selected = briefs.filter((brief) => brief.signalId === signalId);
    const selectedScores = selected.flatMap((brief) => brief.result.status === "READY" ? [brief.result.decisionBrief.score.decisionScore] : []);
    const rates = breakdownRates(selected, validFeedback, validActions);
    return { signalId, title: selected[0].signalSnapshot.title, decisionBriefs: selected.length, averageDecisionScore: average(selectedScores), usefulnessRate: rates.usefulnessRate, actionStartRate: rates.actionStartRate, actionCompletionRate: rates.actionCompletionRate };
  }).sort((a, b) => b.decisionBriefs - a.decisionBriefs);
  const startedCount = validActions.filter((action) => everEntered(action, "IN_PROGRESS")).length;
  const completedCount = validActions.filter((action) => everEntered(action, "COMPLETED")).length;
  const outcomeCount = recorded.length;
  const funnelCounts = [
    ["Business Profiles", profiles.length],
    ["Decision Briefs", briefs.length],
    ["Rated Decisions", validFeedback.length],
    ["Started Actions", startedCount],
    ["Completed Actions", completedCount],
    ["Recorded Outcomes", outcomeCount],
  ] as const;
  const funnel = funnelCounts.map(([label, count], index) => ({
    label,
    count,
    fromPrevious: index === 0 ? null : rate(count, funnelCounts[index - 1][1]),
    fromDecisionBriefs: index < 2 ? null : rate(count, briefs.length),
  }));
  const owners = new Set([...profiles, ...briefs, ...validFeedback, ...validActions].map((item) => item.ownerId));
  return OperatorProductMetricsSchema.parse({
    totalBusinessProfiles: profiles.length,
    totalAnonymousOwners: owners.size,
    totalDecisionBriefs: briefs.length,
    readyDecisionBriefs: ready.length,
    insufficientEvidenceBriefs: briefs.length - ready.length,
    totalUsefulnessRatings: validFeedback.length,
    totalActionRecords: validActions.length,
    activeIndustries: new Set(profiles.map((profile) => profile.industry)).size,
    publishedSignalsUsed: new Set(briefs.map((brief) => brief.signalId)).size,
    averageDecisionScore: average(scores),
    medianDecisionScore: median(scores),
    usefulRate: common.usefulnessRate,
    actionStartRate: common.actionStartRate,
    actionCompletionRate: common.actionCompletionRate,
    actionAbandonmentRate: rate(common.abandoned.length, startedCount),
    positiveOutcomeRate: common.positiveOutcomeRate,
    insufficientEvidenceRate: rate(briefs.length - ready.length, briefs.length),
    industries,
    positions: positionRows,
    actionStatuses: statusRows,
    outcomes: outcomeRows,
    signals: signalRows,
    funnel,
  });
}
