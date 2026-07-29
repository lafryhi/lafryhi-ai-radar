import { Policy } from "@/app/terms/page";
export default function PrivacyPage() { return <Policy title="Privacy Policy">
  <p>We store the minimum data needed to operate the anonymous workspace and paid subscription.</p>
  <h2>Product data</h2><p>Stored data may include Business Profiles, Decision Briefs and immutable context snapshots, feedback, action status, notes, user-reported outcomes, and owner-scoped analytics.</p>
  <h2>Billing data</h2><p>For paid conversion we store a validated email, optional display name, internal billing linkage, Paddle customer/subscription identifiers, subscription status, safe webhook audit records, entitlements, and usage counters. We do not store payment-card data.</p>
  <h2>Processors</h2><p>Google Cloud provides hosting and Firestore persistence, Gemini provides assisted analysis, and Paddle provides payment and subscription processing. Data is shared only as required for those services.</p>
  <h2>Anonymous limitation</h2><p>The server-managed cookie links this browser to stored records. It is not full authentication and cannot provide account recovery or secure cross-device transfer.</p>
</Policy>; }
