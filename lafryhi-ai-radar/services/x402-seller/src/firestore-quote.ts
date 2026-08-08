import { createHash } from "node:crypto";
import { z } from "zod";
export interface FirestoreDocumentSnapshotLike {
  readonly exists: boolean;
  data(): unknown;
}
export interface FirestoreDocumentReferenceLike {
  readonly id?: string;
}
export interface FirestoreTransactionLike {
  get(
    reference: FirestoreDocumentReferenceLike,
  ): Promise<FirestoreDocumentSnapshotLike>;
  create(reference: FirestoreDocumentReferenceLike, data: unknown): void;
}
export interface FirestoreLike {
  collection(name: string): {
    doc(id: string): FirestoreDocumentReferenceLike & {
      get(): Promise<FirestoreDocumentSnapshotLike>;
    };
  };
  runTransaction<T>(
    operation: (transaction: FirestoreTransactionLike) => Promise<T>,
  ): Promise<T>;
}
import type {
  ApprovedBriefReference,
  QuoteClaim,
  QuoteSourcePort,
  QuoteStorePort,
  StoredQuote,
} from "./quote.js";

export const QUOTE_COLLECTION = "sellerDecisionBriefQuotes";
const QuoteDocumentSchema = z
  .object({
    state: z.literal("ISSUED"),
    requestFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    buyerAgentReference: z.string(),
    quote: z.object({ expiresAt: z.string().datetime() }).passthrough(),
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
  })
  .passthrough();

export interface ReadableFirestore {
  collection(name: string): {
    doc(id: string): {
      get(): Promise<FirestoreDocumentSnapshotLike>;
    };
  };
}

export class FirestoreQuoteSource implements QuoteSourcePort {
  constructor(private readonly firestore: ReadableFirestore) {}
  async findBrief(id: string): Promise<ApprovedBriefReference | null> {
    const snapshot = await this.firestore
      .collection("decisionBriefs")
      .doc(id)
      .get();
    if (!snapshot.exists) return null;
    const parsed = z
      .object({
        id: z.string(),
        signalId: z.string(),
        schemaVersion: z.number().int(),
      })
      .safeParse(snapshot.data());
    if (!parsed.success) throw new Error("Malformed approved Decision Brief");
    return {
      id: parsed.data.id,
      signalId: parsed.data.signalId,
      artifactVersion: parsed.data.schemaVersion,
    };
  }
  async findPublishedRadarItem(id: string) {
    const snapshot = await this.firestore
      .collection("radarItems")
      .doc(id)
      .get();
    if (!snapshot.exists) return null;
    const parsed = z
      .object({
        id: z.string(),
        publicTitle: z.string().min(1).max(300),
        publicationState: z.literal("published"),
      })
      .safeParse(snapshot.data());
    return parsed.success && parsed.data.id === id
      ? { title: parsed.data.publicTitle }
      : null;
  }
}

export class FirestoreQuoteStore implements QuoteStorePort {
  constructor(private readonly firestore: FirestoreLike) {}
  async claim(
    requestId: string,
    proposed: StoredQuote,
    now: Date,
  ): Promise<QuoteClaim> {
    const documentId = createHash("sha256")
      .update("lafryhi-seller-quote-request-v1:")
      .update(requestId)
      .digest("hex");
    const reference = this.firestore
      .collection(QUOTE_COLLECTION)
      .doc(documentId);
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) {
        transaction.create(reference, proposed);
        return { kind: "created", record: proposed };
      }
      const parsed = QuoteDocumentSchema.safeParse(snapshot.data());
      if (!parsed.success) throw new Error("Malformed quote record");
      const existing = parsed.data as unknown as StoredQuote;
      if (existing.requestFingerprint !== proposed.requestFingerprint)
        return { kind: "conflict" };
      if (Date.parse(existing.expiresAt) <= now.getTime())
        return { kind: "expired" };
      return { kind: "existing", record: existing };
    });
  }
}
