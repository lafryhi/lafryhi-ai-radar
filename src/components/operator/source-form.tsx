import type { SourceDefinition } from "@/domain/schemas";
import { createManagedSource, updateManagedSource } from "@/app/operator/actions";

export function SourceForm({ source }: { source?: SourceDefinition }) {
  const archived = source?.status === "archived";
  return <form action={source ? updateManagedSource : createManagedSource} className="form source-form">
    {source && <input type="hidden" name="sourceDefinitionId" value={source.id} />}
    <div className="detail-grid">
      <label>Display name<input name="displayName" defaultValue={source?.displayName} minLength={2} maxLength={120} required disabled={archived} /></label>
      <label>Publisher<input name="publisher" defaultValue={source?.publisher} minLength={2} maxLength={120} required disabled={archived} /></label>
      <label>Canonical domain<input name="canonicalDomain" defaultValue={source?.canonicalDomain} placeholder="example.com" required disabled={archived} /></label>
      <label>Homepage<input name="homepage" type="url" defaultValue={source?.homepage} placeholder="https://example.com" required disabled={archived} /></label>
      <label>RSS URL (metadata only)<input name="rssUrl" type="url" defaultValue={source?.rssUrl || ""} disabled={archived} /></label>
      <label>Documentation URL<input name="documentationUrl" type="url" defaultValue={source?.documentationUrl || ""} disabled={archived} /></label>
      <label>Category<select name="category" defaultValue={source?.category || "ai_platform"} disabled={archived}><option value="ai_platform">AI platform</option><option value="model_provider">Model provider</option><option value="research_lab">Research lab</option><option value="developer_platform">Developer platform</option><option value="business_program">Business program</option><option value="public_policy">Public policy</option><option value="other">Other</option></select></label>
      <label>Language<input name="language" defaultValue={source?.language || "en"} required disabled={archived} /></label>
      <label>Country<input name="country" defaultValue={source?.country || "US"} pattern="[A-Za-z]{2}" required disabled={archived} /></label>
      <label>Trust level<select name="trustLevel" defaultValue={source?.trustLevel || "official"} disabled={archived}><option value="official">Official</option><option value="verified">Verified</option><option value="community">Community</option><option value="experimental">Experimental</option><option value="blocked">Blocked</option></select></label>
      <label>Status<select name="status" defaultValue={source?.status || "disabled"} disabled={archived}><option value="enabled">Enabled</option><option value="disabled">Disabled</option><option value="blocked">Blocked</option><option value="archived">Archived</option></select></label>
    </div>
    <label>Operator notes<textarea name="notes" defaultValue={source?.notes} maxLength={2000} disabled={archived} /></label>
    <p className="notice">Human review is mandatory for every analysis from this source.</p>
    {!archived && <button>{source ? "Update source metadata" : "Register source"}</button>}
  </form>;
}
