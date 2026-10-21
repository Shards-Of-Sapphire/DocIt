import { requireActiveChapter } from "@/app/_lib/session";
import { db } from "@/lib/db";
import Link from "next/link";
import { EVENT_TYPES, EVENT_STATUSES } from "@/app/_lib/event-helpers";
import { formatDistanceToNow } from "date-fns";

export const metadata = { title: "Events" };

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string; search?: string };
}) {
  const { active } = await requireActiveChapter();

  const whereClause: any = { chapterId: active.chapterId };

  if (searchParams.status && EVENT_STATUSES.includes(searchParams.status as any)) {
    whereClause.status = searchParams.status;
  }
  if (searchParams.type && EVENT_TYPES.includes(searchParams.type as any)) {
    whereClause.type = searchParams.type;
  }
  if (searchParams.search) {
    whereClause.title = { contains: searchParams.search, mode: "insensitive" };
  }

  const events = await db.event.findMany({
    where: whereClause,
    orderBy: { startsAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        <Link href="/events/new" className="btn btn-primary">
          + New event
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-content space-y-4">
          <div className="flex gap-4">
            <input
              type="search"
              placeholder="Search events..."
              defaultValue={searchParams.search || ""}
              className="input flex-1"
            />
            <select defaultValue={searchParams.status || ""} className="input w-40">
              <option value="">All statuses</option>
              {EVENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select defaultValue={searchParams.type || ""} className="input w-40">
              <option value="">All types</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="card">
        {events.length === 0 ? (
          <div className="card-content py-12 text-center">
            <p className="text-gray-500">No events found.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Title</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b">
                  <td className="px-6 py-4 font-medium">{event.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{event.type}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDistanceToNow(event.startsAt, { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge badge-${
                      event.status === "COMPLETED" ? "success" :
                      event.status === "PLANNED" ? "neutral" :
                      "warning"
                    }`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/events/${event.id}`} className="text-blue-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
