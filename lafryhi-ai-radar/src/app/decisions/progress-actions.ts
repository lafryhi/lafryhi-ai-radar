"use server";

import { revalidatePath } from "next/cache";
import { requireAnonymousSessionId } from "@/auth/anonymous-session";
import { getRepository } from "@/persistence";
import {
  DecisionProgressError,
  recordDecisionOutcome,
  submitDecisionUsefulness,
  transitionDecisionAction,
  updateDecisionActionNote,
} from "@/services/decision-progress";

export interface ProgressActionState {
  status: "idle" | "success" | "error";
  message: string;
}

function result(error: unknown, success: string): ProgressActionState {
  if (!error) return { status: "success", message: success };
  return {
    status: "error",
    message: error instanceof DecisionProgressError ? error.message : "Unable to update Decision Progress.",
  };
}

export async function submitUsefulnessAction(_state: ProgressActionState, formData: FormData): Promise<ProgressActionState> {
  const briefId = String(formData.get("decisionBriefId") ?? "");
  try {
    const ownerId = await requireAnonymousSessionId();
    await submitDecisionUsefulness(await getRepository(), ownerId, briefId, {
      usefulness: formData.get("usefulness"),
      ownerId: formData.get("ownerId"),
    });
    revalidatePath(`/decisions/${briefId}`);
    revalidatePath("/decisions");
    return result(null, "Usefulness rating saved.");
  } catch (error) {
    return result(error, "");
  }
}

export async function transitionActionStatusAction(_state: ProgressActionState, formData: FormData): Promise<ProgressActionState> {
  const briefId = String(formData.get("decisionBriefId") ?? "");
  try {
    const ownerId = await requireAnonymousSessionId();
    await transitionDecisionAction(await getRepository(), ownerId, briefId, {
      status: formData.get("status"),
      actionNote: formData.get("actionNote"),
      outcome: formData.get("outcome"),
      outcomeSummary: formData.get("outcomeSummary"),
      ownerId: formData.get("ownerId"),
    });
    revalidatePath(`/decisions/${briefId}`);
    revalidatePath("/decisions");
    return result(null, "Action status updated.");
  } catch (error) {
    return result(error, "");
  }
}

export async function recordOutcomeAction(_state: ProgressActionState, formData: FormData): Promise<ProgressActionState> {
  const briefId = String(formData.get("decisionBriefId") ?? "");
  try {
    const ownerId = await requireAnonymousSessionId();
    await recordDecisionOutcome(await getRepository(), ownerId, briefId, {
      outcome: formData.get("outcome"),
      outcomeSummary: formData.get("outcomeSummary"),
      ownerId: formData.get("ownerId"),
    });
    revalidatePath(`/decisions/${briefId}`);
    revalidatePath("/decisions");
    return result(null, "Outcome saved.");
  } catch (error) {
    return result(error, "");
  }
}

export async function updateActionNoteAction(_state: ProgressActionState, formData: FormData): Promise<ProgressActionState> {
  const briefId = String(formData.get("decisionBriefId") ?? "");
  try {
    const ownerId = await requireAnonymousSessionId();
    await updateDecisionActionNote(await getRepository(), ownerId, briefId, {
      actionNote: formData.get("actionNote"),
      ownerId: formData.get("ownerId"),
    });
    revalidatePath(`/decisions/${briefId}`);
    return result(null, "Action note saved.");
  } catch (error) {
    return result(error, "");
  }
}
