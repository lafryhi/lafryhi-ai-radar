import express, { type RequestHandler } from "express";
import {
  CATEGORY,
  DecisionBriefRequestSchema,
  SERVICE_ID,
  SERVICE_NAME,
  SERVICE_VERSION,
  type VerifiedPayment,
} from "./contracts.js";
import { digest } from "./crypto.js";
import { buildFulfillment, buildReceipt } from "./fulfillment.js";
import {
  DecisionBriefQuoteRequestSchema,
  issueDecisionBriefQuote,
  QuoteError,
  type QuoteConfig,
  type QuoteSourcePort,
  type QuoteStorePort,
} from "./quote.js";
import type {
  FulfillmentRepositoryPort,
  SellerPaymentVerifierPort,
  VerifiedRadarContentPort,
} from "./ports.js";

export interface ServerDependencies {
  content: VerifiedRadarContentPort;
  payments: SellerPaymentVerifierPort;
  repository: FulfillmentRepositoryPort;
  now?: () => string;
  sellerWallet?: string | null;
  officialPaymentMiddleware?: RequestHandler;
  maxRequestBytes?: number;
  quoteSource?: QuoteSourcePort;
  quoteStore?: QuoteStorePort;
  quoteConfig?: QuoteConfig;
}
const safeError = (code: string) => ({ error: code });

export function createApp(deps: ServerDependencies) {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    express.json({ limit: deps.maxRequestBytes ?? 16_384, strict: true }),
  );
  app.get("/health", (_request, response) =>
    response.json({
      status: "ok",
      service: SERVICE_ID,
      version: SERVICE_VERSION,
    }),
  );
  app.get("/service-metadata", (_request, response) =>
    response.json({
      serviceId: SERVICE_ID,
      serviceVersion: SERVICE_VERSION,
      name: SERVICE_NAME,
      category: CATEGORY,
      contracts: {
        request: "/contracts/decision-brief-request.schema.json",
        fulfillment: "/contracts/fulfillment.schema.json",
        receipt: "/contracts/seller-receipt.schema.json",
        paymentRequirements: "x402-v2 PAYMENT-REQUIRED header",
      },
      deploymentStatus: "NOT_DEPLOYED",
      paymentConfigurationStatus: "PENDING_REAL_PROOF",
      acceptedNetworkStatus: "PENDING_REAL_PROOF",
      marketplaceListingStatus: "NOT_LISTED",
      providerVerificationStatus: "NOT_OWNER_APPROVED",
    }),
  );

  app.post("/decision-brief/quote", async (request, response) => {
    const parsed = DecisionBriefQuoteRequestSchema.safeParse(request.body);
    if (!parsed.success)
      return response.status(400).json(safeError("INVALID_QUOTE_REQUEST"));
    if (!deps.quoteSource || !deps.quoteStore || !deps.quoteConfig)
      return response.status(503).json(safeError("QUOTE_SERVICE_UNAVAILABLE"));
    try {
      return response.json(
        await issueDecisionBriefQuote(
          parsed.data,
          deps.quoteSource,
          deps.quoteStore,
          deps.quoteConfig,
          new Date((deps.now ?? (() => new Date().toISOString()))()),
        ),
      );
    } catch (error) {
      if (error instanceof QuoteError)
        return response.status(error.status).json(safeError(error.code));
      return response.status(503).json(safeError("QUOTE_SERVICE_UNAVAILABLE"));
    }
  });

  const paymentBridge: RequestHandler =
    deps.officialPaymentMiddleware ?? ((_req, _res, next) => next());
  app.post("/decision-brief", paymentBridge, async (request, response) => {
    const parsed = DecisionBriefRequestSchema.safeParse(request.body);
    if (!parsed.success)
      return response.status(400).json(safeError("INVALID_REQUEST"));
    const paymentHeader = request.get("payment-signature");
    let authorizationHeader = paymentHeader;
    if (request.payment?.verified) {
      const payment: VerifiedPayment = {
        paymentReference:
          request.payment.transaction ??
          digest({
            payer: request.payment.payer,
            amount: request.payment.amount,
            network: request.payment.network,
            signature: paymentHeader,
          }),
        payerPublicReference: request.payment.payer,
        amount: request.payment.amount,
        currency: "USDC",
        network: request.payment.network,
        authorizationStatus: "AUTHORIZATION_VERIFIED",
        settlementStatus: "SETTLEMENT_PENDING",
        ...(request.payment.transaction
          ? { transaction: request.payment.transaction }
          : {}),
      };
      authorizationHeader = Buffer.from(JSON.stringify(payment)).toString(
        "base64url",
      );
    }
    const decision = await deps.payments.verify({
      serviceId: SERVICE_ID,
      serviceVersion: SERVICE_VERSION,
      ...(authorizationHeader ? { authorizationHeader } : {}),
    });
    if (decision.kind === "required") {
      if (decision.paymentRequiredHeader)
        response.set("PAYMENT-REQUIRED", decision.paymentRequiredHeader);
      return response.status(402).json(safeError("PAYMENT_REQUIRED"));
    }
    if (decision.kind === "invalid")
      return response.status(402).json(safeError("PAYMENT_INVALID"));
    const fingerprint = digest(parsed.data);
    const claim = await deps.repository.claim(
      decision.payment.paymentReference,
      fingerprint,
    );
    if (claim.kind === "conflict")
      return response.status(409).json(safeError("PAYMENT_REQUEST_MISMATCH"));
    if (claim.kind === "existing")
      return response.json({
        fulfillment: claim.record.artifact,
        receipt: claim.record.receipt,
      });
    const now = (deps.now ?? (() => new Date().toISOString()))();
    try {
      const items = await deps.content.findVerified(parsed.data);
      const artifact = buildFulfillment(
        parsed.data,
        decision.payment,
        items,
        now,
      );
      const receipt = buildReceipt(
        parsed.data,
        decision.payment,
        artifact,
        fingerprint,
        deps.sellerWallet ?? null,
        now,
      );
      await deps.repository.complete({
        paymentReference: decision.payment.paymentReference,
        requestFingerprint: fingerprint,
        buyerAgentReference: parsed.data.buyerAgentReference,
        businessGoalReference: parsed.data.businessGoalReference,
        serviceVersion: SERVICE_VERSION,
        fulfillmentDigest: artifact.fulfillmentDigest,
        fulfillmentStatus: "FULFILLMENT_DELIVERED",
        artifact,
        receipt,
        createdAt: now,
        updatedAt: now,
      });
      return response.json({ fulfillment: artifact, receipt });
    } catch {
      await deps.repository.release(
        decision.payment.paymentReference,
        fingerprint,
      );
      return response.status(503).json(safeError("FULFILLMENT_UNAVAILABLE"));
    }
  });
  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      const type =
        typeof error === "object" && error !== null && "type" in error
          ? String(error.type)
          : "";
      response
        .status(type === "entity.too.large" ? 413 : 400)
        .json(
          safeError(
            type === "entity.too.large" ? "REQUEST_TOO_LARGE" : "INVALID_JSON",
          ),
        );
    },
  );
  return app;
}
