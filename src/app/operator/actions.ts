"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clearOperatorCookie, requireOperator, setOperatorCookie, validOperatorToken } from "@/auth/operator";
import { getRepository } from "@/persistence";
import { getAnalyzer } from "@/services/ai";
import { rerunPipeline, runPipeline } from "@/services/pipeline";
import { reviewAnalysis } from "@/services/review";
import { ReviewActionError } from "@/services/review";
import { logOperatorEvent } from "@/services/operator-events";
import { createSourceDefinition, SourceManagementError, transitionSource, updateSourceDefinition, type SourceInput } from "@/services/source-management";
import { discoverRss } from "@/services/rss-discovery";
import { processRssCandidate } from "@/services/rss-candidate-processing";

export async function login(form: FormData) {
  const token = String(form.get("token") || "");
  if (!validOperatorToken(token)) redirect("/operator/login?error=invalid");
  await setOperatorCookie(token);
  redirect("/operator");
}

export async function logout() { await clearOperatorCookie(); redirect("/operator/login"); }

export async function submitSource(form: FormData) {
  await requireOperator();
  try {
    await runPipeline(String(form.get("url") || ""), await getRepository(), await getAnalyzer());
    revalidatePath("/operator"); redirect("/operator?result=processed");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed";
    redirect(`/operator?error=${encodeURIComponent(message)}`);
  }
}

export async function decide(form: FormData) {
  await requireOperator();
  const status = String(form.get("status"));
  const analysisId = String(form.get("analysisId") || "");
  if (!analysisId || !["approved", "rejected"].includes(status)) {
    logOperatorEvent({ event: "operator.action_failed", analysisId: analysisId || "missing", action: status === "rejected" ? "reject" : "approve", reason: "invalid_request" }, "warn");
    redirect("/operator/review?error=invalid-request");
  }
  try {
    await reviewAnalysis(await getRepository(), analysisId, status as "approved" | "rejected", String(form.get("note") || ""));
    revalidatePath("/"); revalidatePath("/operator"); revalidatePath("/operator/review");
    redirect(`/operator/review/${analysisId}?result=${status}`);
  } catch (error) {
    if (error instanceof ReviewActionError) redirect(`/operator/review/${analysisId}?error=${error.statusCode === 409 ? "conflict" : "invalid-action"}`);
    logOperatorEvent({ event: "operator.action_failed", analysisId, action: status === "rejected" ? "reject" : "approve", reason: "persistence_failure" }, "warn");
    redirect(`/operator/review/${analysisId}?error=operation-failed`);
  }
}

export async function rerun(form: FormData) {
  await requireOperator();
  try {
    await rerunPipeline(String(form.get("sourceRecordId")), await getRepository(), await getAnalyzer());
    revalidatePath("/operator"); redirect("/operator?result=rerun");
  } catch (error) { redirect(`/operator?error=${encodeURIComponent(error instanceof Error ? error.message : "Rerun failed")}`); }
}

function sourceInput(form: FormData): SourceInput {
  const nullableUrl = (name: string) => {
    const value = String(form.get(name) || "").trim();
    return value || null;
  };
  const domainList = (name: string) => [...new Set(String(form.get(name) || "").split(/[,\r\n]+/).map((value) => value.trim().toLowerCase()).filter(Boolean))];
  return {
    displayName: String(form.get("displayName") || ""),
    publisher: String(form.get("publisher") || ""),
    canonicalDomain: String(form.get("canonicalDomain") || ""),
    allowedFeedDomains: domainList("allowedFeedDomains"),
    allowedArticleDomains: domainList("allowedArticleDomains"),
    homepage: String(form.get("homepage") || ""),
    rssUrl: nullableUrl("rssUrl"),
    documentationUrl: nullableUrl("documentationUrl"),
    category: String(form.get("category")) as SourceInput["category"],
    language: String(form.get("language") || ""),
    country: String(form.get("country") || ""),
    trustLevel: String(form.get("trustLevel")) as SourceInput["trustLevel"],
    status: String(form.get("status")) as SourceInput["status"],
    requiresHumanReview: true,
    notes: String(form.get("notes") || ""),
  };
}

export async function createManagedSource(form: FormData) {
  await requireOperator();
  try {
    const created = await createSourceDefinition(await getRepository(), sourceInput(form));
    revalidatePath("/operator/sources");
    redirect(`/operator/sources/${created.id}?result=created`);
  } catch (error) {
    const code = error instanceof SourceManagementError ? error.statusCode : 503;
    redirect(`/operator/sources?error=${code}`);
  }
}

export async function updateManagedSource(form: FormData) {
  await requireOperator();
  const id = String(form.get("sourceDefinitionId") || "");
  try {
    await updateSourceDefinition(await getRepository(), id, sourceInput(form));
    revalidatePath("/operator/sources");
    revalidatePath(`/operator/sources/${id}`);
    redirect(`/operator/sources/${id}?result=updated`);
  } catch (error) {
    const code = error instanceof SourceManagementError ? error.statusCode : 503;
    redirect(`/operator/sources/${id}?error=${code}`);
  }
}

export async function changeManagedSourceStatus(form: FormData) {
  await requireOperator();
  const id = String(form.get("sourceDefinitionId") || "");
  const action = String(form.get("sourceAction") || "");
  if (!["enable", "disable", "block", "archive"].includes(action)) redirect(`/operator/sources/${id}?error=400`);
  try {
    await transitionSource(await getRepository(), id, action as "enable" | "disable" | "block" | "archive");
    revalidatePath("/operator/sources");
    revalidatePath(`/operator/sources/${id}`);
    redirect(`/operator/sources/${id}?result=${action}`);
  } catch (error) {
    const code = error instanceof SourceManagementError ? error.statusCode : 503;
    redirect(`/operator/sources/${id}?error=${code}`);
  }
}

export async function discoverSourceNow(form: FormData) {
  await requireOperator();
  const id = String(form.get("sourceDefinitionId") || "");
  try {
    const run = await discoverRss(await getRepository(), "manual", id);
    revalidatePath(`/operator/sources/${id}`);
    revalidatePath("/operator/runs");
    redirect(`/operator/sources/${id}?discovery=${run.status}&runId=${run.id}`);
  } catch {
    redirect(`/operator/sources/${id}?discovery=failed`);
  }
}

export async function processDiscoveredCandidate(form: FormData) {
  await requireOperator();
  const candidateId = String(form.get("candidateId") || "");
  const sourceDefinitionId = String(form.get("sourceDefinitionId") || "");
  try {
    await processRssCandidate(await getRepository(), await getAnalyzer(), candidateId);
  } catch {
    redirect(`/operator/sources/${sourceDefinitionId}?candidate=failed`);
  }
  revalidatePath(`/operator/sources/${sourceDefinitionId}`);
  revalidatePath("/operator/review");
  redirect(`/operator/sources/${sourceDefinitionId}?candidate=processed`);
}
