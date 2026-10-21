import { requireActiveChapter, loadEventForUser } from "@/app/_lib/session";
import { db } from "@/lib/db";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { user, active } = await requireActiveChapter();

  // Recent events
  const recentEvents = await db.event.findMany({
    where: { chapterId: active.chapterId },
    orderBy: { startsAt: "desc" },
    take: 5,
  });

  // Stats
  const totalEvents = await db.event.count({ where: { chapterId: active.chapterId } });
  const completedEvents = await db.event.count({
    where: { chapterId: active.chapterId, status: "COMPLETED" },
  });

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total events", value: totalEvents },
          { label: "Completed", value: completedEvents },
          { label: "Pending approval", value: 0 },
        ].map((stat) => (
          <div key={stat.label} className="card">
            <div className="card-content">
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Events */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div>
            <h2 className="card-title">Recent events</h2>
            <p className="card-description">Last 5 events in this chapter</p>
          </div>
          <Link href="/events/new" className="btn btn-primary btn-sm">
            + New event
          </Link>
        </div>
        <div className="card-content">
          {recentEvents.length === 0 ? (
            <p className="text-gray-500">No events yet. Create one to get started.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left font-medium">Title</th>
                  <th className="py-2 text-left font-medium">Date</th>
                  <th className="py-2 text-left font-medium">Status</th>
                  <th className="py-2 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((event) => (
                  <tr key={event.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{event.title}</td>
                    <td className="py-3 text-gray-600">
                      {formatDistanceToNow(event.startsAt, { addSuffix: true })}
                    </td>
                    <td className="py-3">
                      <span className={`badge badge-${event.status === "COMPLETED" ? "success" : "neutral"}`}>
                        {event.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="py-3">
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
    </div>
  );
}
