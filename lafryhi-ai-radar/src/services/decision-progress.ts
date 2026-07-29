import {
  DecisionActionSchema,
  DecisionActionStatusSchema,
  DecisionFeedbackSchema,
  DecisionOutcomeSchema,
  DecisionUsefulnessSchema,
  type DecisionAction,
  type DecisionActionStatus,
  type DecisionFeedback,
  type DecisionOutcome,
  type DecisionUsefulness,
} from "@/domain/decision-progress";
import type { StoredDecisionBrief } from "@/domain/public-mvp";
import type { RadarRepository } from "@/persistence/repository";

export class DecisionProgressError extends Error {
  constructor(message: string, readonly code: "INVALID_INPUT" | "NOT_FOUND" | "INVALID_TRANSITION") {
    super(message);
  }
}

const transitions: Record<DecisionActionStatus, readonly DecisionActionStatus[]> = {
  NOT_STARTED: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED", "ABANDONED"],
  COMPLETED: ["IN_PROGRESS"],
  ABANDONED: ["IN_PROGRESS"],
};

export interface DecisionProgressView {
  feedback: DecisionFeedback | null;
  action: DecisionAction | null;
  actionStatus: DecisionActionStatus;
}

export interface DecisionListProgress {
  brief: StoredDecisionBrief;
  progress: DecisionProgressView;
}

async function requireOwnedBrief(repository: RadarRepository, ownerId: string, decisionBriefId: string) {
  const brief = await repository.getDecisionBrief(decisionBriefId);
  if (!brief || brief.ownerId !== ownerId) throw new DecisionProgressError("Decision Brief not found.", "NOT_FOUND");
  return brief;
}

function nullableNote(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new DecisionProgressError(`${label} is invalid.`, "INVALID_INPUT");
  const note = value.trim();
  if (note.length > 500) throw new DecisionProgressError(`${label} must be 500 characters or fewer.`, "INVALID_INPUT");
  return note || null;
}

export async function submitDecisionUsefulness(
  repository: RadarRepository,
  ownerId: string,
  decisionBriefId: string,
  input: unknown,
  now = new Date().toISOString(),
) {
  await requireOwnedBrief(repository, ownerId, decisionBriefId);
  const value = input && typeof input === "object" ? (input as Record<string, unknown>).usefulness : input;
  const parsed = DecisionUsefulnessSchema.safeParse(value);
  if (!parsed.success) throw new DecisionProgressError("Usefulness must be USEFUL or NOT_USEFUL.", "INVALID_INPUT");
  const existing = await repository.findDecisionFeedbackByBrief(decisionBriefId);
  if (existing && existing.ownerId !== ownerId) throw new DecisionProgressError("Decision Brief not found.", "NOT_FOUND");
  const feedback = DecisionFeedbackSchema.parse({
    id: existing?.id ?? decisionBriefId,
    ownerId,
    decisionBriefId,
    usefulness: parsed.data,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    schemaVersion: 1,
  });
  await repository.saveDecisionFeedback(feedback);
  return feedback;
}

export async function getDecisionProgress(
  repository: RadarRepository,
  ownerId: string,
  decisionBriefId: string,
): Promise<DecisionProgressView> {
  await requireOwnedBrief(repository, ownerId, decisionBriefId);
  const [feedback, action] = await Promise.all([
    repository.findDecisionFeedbackByBrief(decisionBriefId),
    repository.findDecisionActionByBrief(decisionBriefId),
  ]);
  if ((feedback && feedback.ownerId !== ownerId) || (action && action.ownerId !== ownerId)) {
    throw new DecisionProgressError("Decision Brief not found.", "NOT_FOUND");
  }
  return { feedback, action, actionStatus: action?.status ?? "NOT_STARTED" };
}

export async function transitionDecisionAction(
  repository: RadarRepository,
  ownerId: string,
  decisionBriefId: string,
  input: unknown,
  now = new Date().toISOString(),
) {
  const brief = await requireOwnedBrief(repository, ownerId, decisionBriefId);
  const payload = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const target = DecisionActionStatusSchema.safeParse(payload.status);
  if (!target.success) throw new DecisionProgressError("Action status is invalid.", "INVALID_INPUT");
  const existing = await repository.findDecisionActionByBrief(decisionBriefId);
  if (existing && existing.ownerId !== ownerId) throw new DecisionProgressError("Decision Brief not found.", "NOT_FOUND");
  const currentStatus = existing?.status ?? "NOT_STARTED";
  if (!transitions[currentStatus].includes(target.data)) {
    throw new DecisionProgressError(`Cannot move an action from ${currentStatus} to ${target.data}.`, "INVALID_TRANSITION");
  }
  const actionNote = payload.actionNote === undefined || payload.actionNote === null
    ? existing?.actionNote ?? null
    : nullableNote(payload.actionNote, "Action note");
  let outcome: DecisionOutcome | null = existing?.outcome ?? null;
  if (payload.outcome !== undefined && payload.outcome !== null && payload.outcome !== "") {
    const parsedOutcome = DecisionOutcomeSchema.safeParse(payload.outcome);
    if (!parsedOutcome.success) throw new DecisionProgressError("Outcome is invalid.", "INVALID_INPUT");
    outcome = parsedOutcome.data;
  }
  const outcomeSummary = payload.outcomeSummary === undefined || payload.outcomeSummary === null
    ? existing?.outcomeSummary ?? null
    : nullableNote(payload.outcomeSummary, "Outcome summary");
  const action = DecisionActionSchema.parse({
    id: existing?.id ?? decisionBriefId,
    ownerId,
    decisionBriefId,
    businessProfileId: brief.businessProfileId,
    signalId: brief.signalId,
    status: target.data,
    actionNote,
    outcome: target.data === "COMPLETED" ? outcome ?? "UNKNOWN" : existing?.outcome ?? null,
    outcomeSummary: target.data === "COMPLETED" ? outcomeSummary : existing?.outcomeSummary ?? null,
    startedAt: existing?.startedAt ?? (target.data === "IN_PROGRESS" ? now : null),
    completedAt: existing?.completedAt ?? (target.data === "COMPLETED" ? now : null),
    abandonedAt: existing?.abandonedAt ?? (target.data === "ABANDONED" ? now : null),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    statusHistory: [...(existing?.statusHistory ?? []), { from: currentStatus, to: target.data, changedAt: now }],
    schemaVersion: 1,
  });
  await repository.saveDecisionAction(action);
  return action;
}

export async function recordDecisionOutcome(
  repository: RadarRepository,
  ownerId: string,
  decisionBriefId: string,
  input: unknown,
  now = new Date().toISOString(),
) {
  await requireOwnedBrief(repository, ownerId, decisionBriefId);
  const existing = await repository.findDecisionActionByBrief(decisionBriefId);
  if (!existing || existing.ownerId !== ownerId) throw new DecisionProgressError("Decision action not found.", "NOT_FOUND");
  if (existing.status !== "COMPLETED") throw new DecisionProgressError("An outcome can only be recorded for a completed action.", "INVALID_TRANSITION");
  const payload = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const outcome = DecisionOutcomeSchema.safeParse(payload.outcome);
  if (!outcome.success) throw new DecisionProgressError("Outcome is invalid.", "INVALID_INPUT");
  const action = DecisionActionSchema.parse({
    ...existing,
    outcome: outcome.data,
    outcomeSummary: nullableNote(payload.outcomeSummary, "Outcome summary"),
    updatedAt: now,
  });
  await repository.saveDecisionAction(action);
  return action;
}

export async function updateDecisionActionNote(
  repository: RadarRepository,
  ownerId: string,
  decisionBriefId: string,
  input: unknown,
  now = new Date().toISOString(),
) {
  await requireOwnedBrief(repository, ownerId, decisionBriefId);
  const existing = await repository.findDecisionActionByBrief(decisionBriefId);
  if (!existing || existing.ownerId !== ownerId) throw new DecisionProgressError("Decision action not found.", "NOT_FOUND");
  const payload = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const action = DecisionActionSchema.parse({
    ...existing,
    actionNote: nullableNote(payload.actionNote, "Action note"),
    updatedAt: now,
  });
  await repository.saveDecisionAction(action);
  return action;
}

export async function listDecisionBriefsWithProgress(
  repository: RadarRepository,
  ownerId: string,
  status?: DecisionActionStatus,
  limit = 50,
): Promise<DecisionListProgress[]> {
  if (status && !DecisionActionStatusSchema.safeParse(status).success) throw new DecisionProgressError("Action status filter is invalid.", "INVALID_INPUT");
  const briefs = await repository.listDecisionBriefsByOwner(ownerId, limit);
  const rows = await Promise.all(briefs.map(async (brief) => ({
    brief,
    progress: await getDecisionProgress(repository, ownerId, brief.id),
  })));
  return status ? rows.filter((row) => row.progress.actionStatus === status) : rows;
}

export type { DecisionActionStatus, DecisionOutcome, DecisionUsefulness };
