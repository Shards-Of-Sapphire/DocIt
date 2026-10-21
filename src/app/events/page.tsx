import { requireActiveChapter } from "@/app/_lib/session";
import { db } from "@/lib/db";
import Link from "next/link";
import { EVENT_TYPES, EVENT_STATUSES } from "@/app/_lib/event-helpers";
import { format } from "date-fns";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; type?: string };
}) {
  const { active } = await requireActiveChapter();
  const { q, status, type } = searchParams;

  const events = await db.event.findMany({
    where: {
      chapterId: active.chapterId,
      // Case-insensitive search across title and venue
      OR: q ? [
        { title: { contains: q, mode: 'insensitive' } },
        { venue: { contains: q, mode: 'insensitive' } },
      ] : undefined,
      status: status ? (status as any) : { not: 'ARCHIVED' }, // Default hide archived
      type: type ? (type as any) : undefined,
    },
    orderBy: { startsAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        <div className="flex gap-2">
          <Link href="/events/export" className="btn btn-secondary">Export CSV</Link>
          <Link href="/events/new" className="btn btn-primary">+ New Event</Link>
        </div>
      </div>

      {/* Search Bar & Filters */}
      <form className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title or venue..."
          className="input max-w-xs"
        />
        <select name="status" defaultValue={status} className="input w-40">
          <option value="">All Active</option>
          {EVENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" className="btn btn-primary">Filter</button>
        <Link href="/events" className="btn btn-secondary">Reset</Link>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{e.title}</td>
                <td className="px-4 py-3 text-gray-500">{format(e.startsAt, "MMM dd, yyyy")}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${e.status === 'ARCHIVED' ? 'badge-danger' : 'badge-neutral'}`}>
                    {e.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/events/${e.id}`} className="text-blue-600 hover:underline">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
