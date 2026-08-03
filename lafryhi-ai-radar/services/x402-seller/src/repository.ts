import type {
  ClaimResult,
  FulfillmentRecord,
  FulfillmentRepositoryPort,
} from "./ports.js";
export class InMemoryFulfillmentRepository implements FulfillmentRepositoryPort {
  private records = new Map<string, FulfillmentRecord>();
  private claims = new Map<string, string>();
  async claim(
    paymentReference: string,
    fingerprint: string,
  ): Promise<ClaimResult> {
    const record = this.records.get(paymentReference);
    if (record)
      return record.requestFingerprint === fingerprint
        ? { kind: "existing", record }
        : { kind: "conflict" };
    const claimed = this.claims.get(paymentReference);
    if (claimed)
      return claimed === fingerprint
        ? this.awaitExisting(paymentReference)
        : { kind: "conflict" };
    this.claims.set(paymentReference, fingerprint);
    return { kind: "claimed" };
  }
  private async awaitExisting(paymentReference: string): Promise<ClaimResult> {
    for (let i = 0; i < 100; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1));
      const record = this.records.get(paymentReference);
      if (record) return { kind: "existing", record };
    }
    return { kind: "conflict" };
  }
  async complete(record: FulfillmentRecord) {
    this.records.set(record.paymentReference, record);
    this.claims.delete(record.paymentReference);
  }
  async release(paymentReference: string, fingerprint: string) {
    if (this.claims.get(paymentReference) === fingerprint)
      this.claims.delete(paymentReference);
  }
}

// Production implementations must provide an atomic create-if-absent transaction keyed by paymentReference.
export interface FirestoreFulfillmentDocument extends FulfillmentRecord {
  /* Contract only; no Firestore dependency in this service. */
}
