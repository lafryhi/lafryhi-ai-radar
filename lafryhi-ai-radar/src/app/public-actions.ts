"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnonymousSessionId } from "@/auth/anonymous-session";
import { getRepository } from "@/persistence";
import { GeminiDecisionEngine } from "@/services/decision-engine";
import { generateOwnedDecisionBrief, PublicMvpError, saveBusinessProfile } from "@/services/public-mvp";

export interface PublicActionState {
  status: "idle" | "success" | "error";
  message: string;
}

const values = (formData: FormData, name: string) =>
  formData.getAll(name).map(String).map((value) => value.trim()).filter(Boolean);

export async function saveBusinessProfileAction(
  _state: PublicActionState,
  formData: FormData,
): Promise<PublicActionState> {
  try {
    const ownerId = await requireAnonymousSessionId();
    await saveBusinessProfile(await getRepository(), ownerId, {
      businessName: formData.get("businessName"),
      industry: formData.get("industry"),
      companySize: formData.get("companySize"),
      aiMaturity: formData.get("aiMaturity"),
      businessGoals: values(formData, "businessGoals"),
      currentTools: values(formData, "currentTools"),
      budgetRange: formData.get("budgetRange"),
      riskTolerance: formData.get("riskTolerance"),
      ownerId: formData.get("ownerId"),
    });
    revalidatePath("/business-profile");
    return { status: "success", message: "Your Business Profile has been saved." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof PublicMvpError ? error.message : "Unable to save your Business Profile.",
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
    );
    briefId = brief.id;
  } catch (error) {
    return {
      status: "error",
      message: error instanceof PublicMvpError ? error.message : "Unable to generate this Decision Brief.",
    };
  }
  redirect(`/decisions/${briefId}`);
}
