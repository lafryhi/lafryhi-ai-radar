import type { RequestHandler } from "express";
import type {
  PaymentDecision,
  SellerPaymentVerifierPort,
  PaymentContext,
} from "./ports.js";
import type { VerifiedPayment } from "./contracts.js";

export class DisabledPaymentVerifier implements SellerPaymentVerifierPort {
  async verify(_context: PaymentContext): Promise<PaymentDecision> {
    return { kind: "required" };
  }
}

export class FakePaymentVerifier implements SellerPaymentVerifierPort {
  public calls = 0;
  constructor(
    private readonly decision:
      | PaymentDecision
      | ((context: PaymentContext) => PaymentDecision),
  ) {}
  async verify(context: PaymentContext) {
    this.calls++;
    return typeof this.decision === "function"
      ? this.decision(context)
      : this.decision;
  }
}

export interface CirclePaymentInfo {
  verified: boolean;
  payer: string;
  amount: string;
  network: string;
  transaction?: string;
}
declare global {
  namespace Express {
    interface Request {
      payment?: CirclePaymentInfo;
    }
  }
}

export function circleMiddlewareAdapter(config: {
  sellerAddress: string;
  networks: string[];
  facilitatorUrl: string;
  price: string;
}): Promise<{
  middleware: RequestHandler;
  verifier: SellerPaymentVerifierPort;
}> {
  return import("@circle-fin/x402-batching/server").then(
    ({ createGatewayMiddleware }) => {
      const gateway = createGatewayMiddleware({
        sellerAddress: config.sellerAddress,
        networks: config.networks,
        facilitatorUrl: config.facilitatorUrl,
        description: "Human-verified AI business signal decision brief",
      });
      const verifier: SellerPaymentVerifierPort = {
        async verify(context) {
          const marker = context.authorizationHeader;
          if (!marker) return { kind: "required" };
          // The official middleware has already verified/settled and attached req.payment; server.ts injects its signed result.
          try {
            const payment = JSON.parse(
              Buffer.from(marker, "base64url").toString("utf8"),
            ) as VerifiedPayment;
            return payment.authorizationStatus === "AUTHORIZATION_VERIFIED"
              ? { kind: "verified", payment }
              : { kind: "invalid", reason: "payment_not_verified" };
          } catch {
            return { kind: "invalid", reason: "payment_context_invalid" };
          }
        },
      };
      return { middleware: gateway.require(config.price), verifier };
    },
  );
}
