import { requireActiveChapter, loadEventForUser, notFound } from "@/app/_lib/session";
import { NEXT_ACTION, EVENT_TYPES } from "@/app/_lib/event-helpers";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { DocumentGenerator } from "@/components/documents/DocumentGenerator";
import { CertificateGenerator } from "@/components/certificates/CertificateGenerator";
import { formatCurrency } from "@/lib/utils";
const canEdit = ["CHAIR", "DOCS"].includes(membership.role);

export const metadata = { title: "Event Details" };

export default async function EventDetailPage({
  params,
}: {
  params: { eventId: string };
}) {
  const { user } = await requireActiveChapter();
  const data = await loadEventForUser(params.eventId, user.id);

  if (!data) notFound();

  const { event, membership } = data;
  const canEdit = ["ADMIN", "CHAIR", "DOCS"].includes(membership.role);
  const isCompleted = ["COMPLETED", "REPORTED"].includes(event.status);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{event.title}</h1>
          <p className="text-gray-600">
            {event.type} • {event.chapter.name}
          </p>
        </div>
        <div className="flex gap-2">
          <EventStatusBadge status={event.status} />
          {canEdit && (
            <Link href={`/events/${event.id}/edit`} className="btn btn-secondary btn-sm">
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Next Action Banner */}
      <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4">
        <p className="font-medium text-blue-900">Next action</p>
        <p className="text-sm text-blue-800">{NEXT_ACTION[event.status]}</p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Event Details */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Event details</h2>
            </div>
            <div className="card-content space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Start date</p>
                  <p className="font-medium">
                    {event.startsAt.toLocaleDateString("en-IN", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">End date</p>
                  <p className="font-medium">
                    {event.endsAt.toLocaleDateString("en-IN", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              {event.venue && (
                <div>
                  <p className="text-sm text-gray-600">Venue</p>
                  <p className="font-medium">{event.venue}</p>
                </div>
              )}
              {event.objectives && (
                <div>
                  <p className="text-sm text-gray-600">Objectives</p>
                  <p className="font-medium">{event.objectives}</p>
                </div>
              )}
              {event.outcomes && (
                <div>
                  <p className="text-sm text-gray-600">Outcomes</p>
                  <p className="font-medium">{event.outcomes}</p>
                </div>
              )}
              {event.participantCount && (
                <div>
                  <p className="text-sm text-gray-600">Participants</p>
                  <p className="font-medium">{event.participantCount}</p>
                </div>
              )}
            </div>
          </div>

          {/* Speakers */}
          {event.speakers.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Speakers</h2>
              </div>
              <div className="card-content space-y-4">
                {event.speakers.map((speaker) => (
                  <div key={speaker.id} className="border-b pb-4 last:border-0">
                    <p className="font-medium">{speaker.name}</p>
                    {speaker.designation && (
                      <p className="text-sm text-gray-600">{speaker.designation}</p>
                    )}
                    {speaker.bio && (
                      <p className="text-sm text-gray-600 mt-1">{speaker.bio}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Budget */}
          {event.budgetLines.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Budget</h2>
              </div>
              <div className="card-content">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left font-medium">Item</th>
                      <th className="py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {event.budgetLines.map((line) => (
                      <tr key={line.id} className="border-b last:border-0">
                        <td className="py-2">{line.item}</td>
                        <td className="py-2 text-right">{formatCurrency(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 border-t pt-4 flex justify-end">
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-lg font-bold">
                      {formatCurrency(event.budgetLines.reduce((sum, l) => sum + Number(l.amount), 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Documents */}
          {event.documents.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Documents</h2>
              </div>
              <div className="card-content space-y-2">
                {event.documents.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/events/${event.id}/documents/${doc.id}`}
                    className="block rounded border p-3 hover:bg-gray-50"
                  >
                    <p className="font-medium">{doc.type}</p>
                    {doc.versions[0] && (
                      <p className="text-sm text-gray-600">
                        Status: {doc.versions[0].status}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Generate Documents */}
          {isCompleted && canEdit && (
            <DocumentGenerator
              eventId={event.id}
              eventTitle={event.title}
              chapterId={event.chapterId}
            />
          )}

          {/* Generate Certificates */}
          {isCompleted && canEdit && (
            <CertificateGenerator
              eventId={event.id}
              eventTitle={event.title}
              chapterId={event.chapterId}
              participantCount={event.participantCount || 0}
            />
          )}

          {/* Approve Documents */}
          {membership.role === "CHAIR" || membership.role === "ADVISOR" ? (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Approvals</h2>
                <p className="card-description">Documents pending your approval</p>
              </div>
              <div className="card-content">
                <p className="text-sm text-gray-600">None pending.</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
