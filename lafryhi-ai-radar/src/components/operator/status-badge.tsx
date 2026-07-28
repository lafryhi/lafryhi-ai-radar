export function StatusBadge({ value }: { value: string }) {
  const className = value.toLowerCase().replaceAll("_", "-").replaceAll(" ", "-");
  const labels: Record<string, string> = {
    approved: "verified",
    published: "Decision Brief",
    pending: "pending verification",
    needs_changes: "verification changes",
    Publish: "ready for verification",
    "Needs Human Attention": "needs Human Verification",
  };
  return <span className={`badge badge-${className}`}>{labels[value] ?? value.replaceAll("_", " ")}</span>;
}
