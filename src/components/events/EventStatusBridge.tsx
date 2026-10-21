export function EventStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PLANNED: "bg-blue-100 text-blue-800",
    LIVE: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    REPORTED: "bg-purple-100 text-purple-800",
    ARCHIVED: "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`badge ${colors[status] || "badge-neutral"}`}>{status}</span>
  );
}
