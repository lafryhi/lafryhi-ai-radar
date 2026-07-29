"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnonymousSessionId } from "@/auth/anonymous-session";
import { getRepository } from "@/persistence";
import { GeminiDecisionEngine } from "@/services/decision-engine";
import { generateOwnedDecisionBrief, PublicMvpError, saveBusinessProfile } from "@/services/public-mvp";
import { BillingError } from "@/services/billing";

export interface PublicActionState {
  status: "idle" | "success" | "error";
  message: string;
  resourceId?: string;
}

const values = (formData: FormData, name: string) =>
  formData.getAll(name).map(String).map((value) => value.trim()).filter(Boolean);

function safeErrorDetails(error: unknown) {
  const candidate = error && typeof error === "object"
    ? error as { name?: unknown; status?: unknown; code?: unknown; message?: unknown }
    : {};
  const message = typeof candidate.message === "string" ? candidate.message : "";
  const category =
    message.includes("schema validation") ? "schema_validation" :
    message.includes("malformed JSON") ? "malformed_json" :
    message.includes("unknown evidence") ? "unknown_evidence" :
    message.includes("exact excerpt") ? "invalid_evidence_excerpt" :
    message.includes("INSUFFICIENT_EVIDENCE") ? "insufficient_evidence" :
    "generation_failure";
  return {
    errorType: typeof candidate.name === "string" ? candidate.name : "UnknownError",
    errorCode: typeof candidate.code === "number" || typeof candidate.code === "string"
      ? String(candidate.code).slice(0, 32)
      : undefined,
    httpStatus: typeof candidate.status === "number" ? candidate.status : undefined,
    category,
    diagnostic: typeof candidate.status === "number"
      ? message
        .replace(/https?:\/\/\S+/g, "[url]")
        .replace(/[^\x20-\x7E]/g, " ")
        .slice(0, 500) || undefined
      : undefined,
  };
}

export async function saveBusinessProfileAction(
  _state: PublicActionState,
  formData: FormData,
): Promise<PublicActionState> {
  try {
    const ownerId = await requireAnonymousSessionId();
    const profile = await saveBusinessProfile(await getRepository(), ownerId, {
      businessName: formData.get("businessName"),
      industry: formData.get("industry"),
      companySize: formData.get("companySize"),
      aiMaturity: formData.get("aiMaturity"),
      businessGoals: values(formData, "businessGoals"),
      currentTools: values(formData, "currentTools"),
      budgetRange: formData.get("budgetRange"),
      riskTolerance: formData.get("riskTolerance"),
      ownerId: formData.get("ownerId"),
    }, undefined, {
      profileId: String(formData.get("profileId") ?? "") || undefined,
      createNew: formData.get("createNew") === "true",
    });
    revalidatePath("/business-profile");
    return { status: "success", message: "Your Business Profile has been saved.", resourceId: profile.id };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof PublicMvpError || error instanceof BillingError ? error.message : "Unable to save your Business Profile.",
    };
  }
}

export async function generateDecisionBriefAction(
  _state: PublicActionState,
  formData: FormData,
): Promise<PublicActionState> {
  let briefId: string;
  try {
    const ownerId = await requireAnonymousSessionId();
    const profileId = String(formData.get("businessProfileId") ?? "");
    const signalId = String(formData.get("signalId") ?? "");
    const brief = await generateOwnedDecisionBrief(
      await getRepository(),
      new GeminiDecisionEngine(),
      ownerId,
      profileId,
      signalId,
      undefined,
      String(formData.get("generationRequestId") ?? ""),
    );
    briefId = brief.id;
  } catch (error) {
    console.error(JSON.stringify({
      event: "public_decision_generation_failed",
      ...safeErrorDetails(error),
    }));
    return {
      status: "error",
      message: error instanceof PublicMvpError || error instanceof BillingError ? error.message : "Unable to generate this Decision Brief.",
    };
  }
  redirect(`/decisions/${briefId}`);
}
