export function StatusBadge({ value }: { value: string }) {
  const className = value.toLowerCase().replaceAll("_", "-").replaceAll(" ", "-");
  return <span className={`badge badge-${className}`}>{value.replaceAll("_", " ")}</span>;
}
