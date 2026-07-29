"use client";

import Script from "next/script";
import { useActionState, useEffect, useState } from "react";
import { prepareProCheckout, type CheckoutState } from "@/app/billing-actions";

declare global {
  interface Window {
    Paddle?: {
      Environment: { set(value: "sandbox"): void };
      Initialize(input: { token: string }): void;
      Checkout: { open(input: unknown): void };
    };
  }
}
const initial: CheckoutState = { status: "idle", message: "", checkout: null };

export function PaddleCheckout() {
  const [state, action, pending] = useActionState(prepareProCheckout, initial);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!loaded || !state.checkout || !window.Paddle) return;
    if (state.checkout.environment === "sandbox") window.Paddle.Environment.set("sandbox");
    window.Paddle.Initialize({ token: state.checkout.clientToken });
    window.Paddle.Checkout.open({
      items: [{ priceId: state.checkout.priceId, quantity: 1 }],
      customer: { email: state.checkout.email },
      customData: state.checkout.customData,
      settings: { displayMode: "overlay", theme: "dark", successUrl: state.checkout.successUrl },
    });
  }, [loaded, state.checkout]);
  return <>
    <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="afterInteractive" onLoad={() => setLoaded(true)} />
    <form action={action} className="public-form checkout-form">
      <input type="hidden" name="plan" value="PRO" />
      <label>Email address<input name="email" type="email" required maxLength={320} autoComplete="email" /></label>
      <label>Display name <small>(optional)</small><input name="displayName" maxLength={120} autoComplete="name" /></label>
      <button className="button-link" disabled={pending}>{pending ? "Preparing secure checkout…" : "Upgrade to Pro"}</button>
      <div className={`form-status ${state.status === "error" ? "error" : ""}`} role="status">{state.message}</div>
    </form>
  </>;
}
