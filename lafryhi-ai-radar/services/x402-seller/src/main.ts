import {
  FixtureRadarContentAdapter,
  GoogleMetadataIdentityTokenProvider,
  HttpRadarContentAdapter,
  StaticDevelopmentTokenProvider,
} from "./content.js";
import { DisabledPaymentVerifier, circleMiddlewareAdapter } from "./payment.js";
import type { SellerPaymentVerifierPort } from "./ports.js";
import { InMemoryFulfillmentRepository } from "./repository.js";
import { createApp } from "./server.js";
import { Firestore } from "@google-cloud/firestore";
import {
  FirestoreQuoteSource,
  FirestoreQuoteStore,
  type FirestoreLike,
} from "./firestore-quote.js";
import { FirestoreProofV1Repository } from "./firestore-proof-v1.js";
import {
  CircleReadOnlySettlementVerifier,
  FrozenProofV1ArtifactLoader,
} from "./proof-v1-fulfillment.js";

const port = Number(process.env.PORT ?? "8080");
const paymentMode = process.env.PAYMENT_MODE ?? "disabled";
const contentMode = process.env.RADAR_CONTENT_MODE ?? "disabled";
const content = contentAdapter(contentMode);
const quoteFirestore = new Firestore({
  databaseId: process.env.FIRESTORE_DATABASE_ID ?? "(default)",
}) as unknown as FirestoreLike;
const proofV1Repository = new FirestoreProofV1Repository(
  quoteFirestore as unknown as Firestore,
);
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
  quoteSource: new FirestoreQuoteSource(quoteFirestore),
  quoteStore: new FirestoreQuoteStore(quoteFirestore),
  quoteConfig: {
    network: process.env.QUOTE_TESTNET_NETWORK,
    sellerAddress: process.env.QUOTE_SELLER_ADDRESS,
    contentDigest: process.env.QUOTE_ARTIFACT_DIGEST,
    ttlMilliseconds: Number(process.env.QUOTE_TTL_MS ?? "300000"),
  },
  ...(process.env.CIRCLE_API_KEY
    ? {
        proofV1: {
          quote: proofV1Repository,
          store: proofV1Repository,
          circle: new CircleReadOnlySettlementVerifier(
            process.env.CIRCLE_API_KEY,
          ),
          artifact: new FrozenProofV1ArtifactLoader(
            process.env.PROOF_V1_ARTIFACT_PATH,
          ),
        },
      }
    : {}),
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

function contentAdapter(mode: string) {
  if (mode === "fixture") {
    if (process.env.NODE_ENV === "production")
      throw new Error("Fixture Radar content is prohibited in production");
    return new FixtureRadarContentAdapter();
  }
  if (mode !== "http")
    throw new Error(
      "RADAR_CONTENT_MODE must be http, or fixture outside production",
    );
  const localToken = process.env.RADAR_EXPORT_LOCAL_TOKEN?.trim();
  return new HttpRadarContentAdapter({
    endpoint: required("RADAR_EXPORT_URL"),
    audience: required("RADAR_EXPORT_AUDIENCE"),
    tokenProvider: localToken
      ? new StaticDevelopmentTokenProvider(localToken)
      : new GoogleMetadataIdentityTokenProvider(),
    timeoutMs: Number(process.env.RADAR_EXPORT_TIMEOUT_MS ?? "8000"),
    maximumResponseBytes: Number(
      process.env.RADAR_EXPORT_MAX_RESPONSE_BYTES ?? "64000",
    ),
  });
}
