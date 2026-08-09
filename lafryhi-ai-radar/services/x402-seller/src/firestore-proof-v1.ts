import { createHash } from "node:crypto";
import type { Firestore } from "@google-cloud/firestore";
import { z } from "zod";
import type {
  ProofV1FulfillmentResponse,
  ProofV1QuoteRecord,
} from "./proof-v1-fulfillment.js";
export class FirestoreProofV1Repository {
  constructor(private readonly firestore: Firestore) {}
  async find(requestId: string): Promise<ProofV1QuoteRecord | null> {
    const id = createHash("sha256")
      .update("lafryhi-seller-quote-request-v1:")
      .update(requestId)
      .digest("hex");
    const snapshot = await this.firestore
      .collection("sellerDecisionBriefQuotes")
      .doc(id)
      .get();
    if (!snapshot.exists) return null;
    const parsed = z
      .object({
        quote: z.object({
          quoteId: z.string(),
          requestId: z.string(),
          decisionBriefId: z.string(),
          artifactVersion: z.number(),
          contentDigest: z.string(),
          amount: z.string(),
          currency: z.string(),
          network: z.string(),
          sellerAddress: z.string(),
        }),
      })
      .safeParse(snapshot.data());
    return parsed.success ? parsed.data.quote : null;
  }
  async claim(
    transactionId: string,
    fingerprint: string,
    response: ProofV1FulfillmentResponse,
  ) {
    const ref = this.firestore
      .collection("sellerProofV1Fulfillments")
      .doc(transactionId);
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) {
        transaction.create(ref, { fingerprint, response });
        return { kind: "created" as const, response };
      }
      const data = snapshot.data() as {
        fingerprint?: unknown;
        response?: unknown;
      };
      if (data.fingerprint !== fingerprint)
        return { kind: "conflict" as const };
      return {
        kind: "existing" as const,
        response: data.response as ProofV1FulfillmentResponse,
      };
    });
  }
}
