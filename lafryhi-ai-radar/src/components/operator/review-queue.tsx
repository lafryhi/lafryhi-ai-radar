import Link from "next/link";
import type { ReviewQueueEntry } from "@/services/operator-dashboard";
import { StatusBadge } from "./status-badge";

export function ReviewQueue({ entries, empty = "No verifications match these filters." }: { entries: ReviewQueueEntry[]; empty?: string }) {
  if (!entries.length) return <div className="panel empty"><h2>Nothing to verify</h2><p>{empty}</p></div>;
  return <div className="review-table-wrap"><table className="review-table">
    <thead><tr><th>Gemini Analysis</th><th>Decision signals</th><th>Intelligence run</th><th>Verification</th><th><span className="sr-only">Open</span></th></tr></thead>
    <tbody>{entries.map((entry) => <tr key={entry.analysis.id}>
      <td><strong>{entry.source.title}</strong><small>{entry.source.sourceName} · {new Date(entry.source.publishedAt).toLocaleDateString()}</small><small>{entry.analysis.category.replaceAll("_", " ")}</small></td>
      <td><span>I {entry.analysis.importanceScore}</span><span>N {entry.analysis.noveltyScore}</span><span>C {entry.analysis.confidenceScore}</span></td>
      <td><small>{new Date(entry.analysis.createdAt).toLocaleString()}</small><small>{entry.run.model} · {entry.processingMode}</small></td>
      <td><StatusBadge value={entry.review.status} /><StatusBadge value={entry.analysis.overallRecommendation} />{entry.radarItem && <StatusBadge value="published" />}</td>
      <td><Link className="button-link" href={`/operator/review/${entry.analysis.id}`}>Verify</Link></td>
    </tr>)}</tbody>
  </table></div>;
}
