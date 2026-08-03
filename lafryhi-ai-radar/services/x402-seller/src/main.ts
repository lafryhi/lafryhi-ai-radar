import {
  FixtureRadarContentAdapter,
  HttpRadarContentAdapter,
} from "./content.js";
import { DisabledPaymentVerifier, circleMiddlewareAdapter } from "./payment.js";
import type { SellerPaymentVerifierPort } from "./ports.js";
import { InMemoryFulfillmentRepository } from "./repository.js";
import { createApp } from "./server.js";

const port = Number(process.env.PORT ?? "8080");
const paymentMode = process.env.PAYMENT_MODE ?? "disabled";
const contentMode = process.env.RADAR_CONTENT_MODE ?? "fixture";
const content =
  contentMode === "http"
    ? new HttpRadarContentAdapter(
        required("RADAR_EXPORT_URL"),
        required("RADAR_EXPORT_AUDIENCE"),
        process.env.RADAR_EXPORT_LOCAL_TOKEN,
      )
    : new FixtureRadarContentAdapter();
let middleware;
let payments: SellerPaymentVerifierPort = new DisabledPaymentVerifier();
if (paymentMode === "circle") {
  const circle = await circleMiddlewareAdapter({
    sellerAddress: required("SELLER_WALLET_ADDRESS"),
    networks: required("ACCEPTED_NETWORKS")
      .split(",")
      .map((value) => value.trim()),
    facilitatorUrl: required("CIRCLE_FACILITATOR_URL"),
    price: required("SERVICE_PRICE_USD"),
  });
  middleware = circle.middleware;
  payments = circle.verifier;
}
const app = createApp({
  content,
  payments,
  repository: new InMemoryFulfillmentRepository(),
  sellerWallet: process.env.SELLER_WALLET_ADDRESS ?? null,
  ...(middleware ? { officialPaymentMiddleware: middleware } : {}),
  maxRequestBytes: Number(process.env.MAX_REQUEST_BYTES ?? "16384"),
});
app.listen(port, "0.0.0.0", () =>
  console.info(
    JSON.stringify({ event: "seller.started", port, paymentMode, contentMode }),
  ),
);

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required configuration: ${name}`);
  return value;
}
