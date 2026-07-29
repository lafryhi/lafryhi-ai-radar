"use server";

import { redirect } from "next/navigation";
import { requireAnonymousSessionId } from "@/auth/anonymous-session";
import { getRepository } from "@/persistence";
import { BillingError, createPortalUrl, initiateCheckout } from "@/services/billing";

export interface CheckoutState {
  status: "idle" | "ready" | "error";
  message: string;
  checkout: null | {
    environment: "sandbox" | "production"; clientToken: string; priceId: string;
    email: string; successUrl: string; customData: Record<string, string>;
  };
}
export async function prepareProCheckout(_state: CheckoutState, formData: FormData): Promise<CheckoutState> {
  try {
    const ownerId = await requireAnonymousSessionId();
    const checkout = await initiateCheckout(await getRepository(), ownerId, {
      plan: "PRO", email: formData.get("email"), displayName: formData.get("displayName"),
    });
    return { status: "ready", message: "Secure checkout is ready.", checkout };
  } catch (error) {
    return { status: "error", message: error instanceof BillingError ? error.message : "Unable to start checkout.", checkout: null };
  }
}

export async function openCustomerPortal() {
  const ownerId = await requireAnonymousSessionId();
  redirect(await createPortalUrl(await getRepository(), ownerId));
}
