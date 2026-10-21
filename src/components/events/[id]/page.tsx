// src/app/events/[id]/page.tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireMember } from "@/server/services/permissions.service";
import { DocumentGenerator } from "@/components/documents/DocumentGenerator";
import { EventStatusPill } from "@/components/events/EventStatusPill";
import { EventDetails } from "@/components/events/EventDetails";

export default async function EventPage({ params }: { params: { id: string } }) {
  const event = await db.event.findUnique({
    where: { id: params.id },
    include: {
      chapter: true,
      speakers: true,
      budgetLines: true,
    },
  });

  if (!event) notFound();

  // Check permissions
  const session = await auth();
  if (!session?.user) return null;
  
  const membership = await requireMember(event.chapterId);

  const isCompleted = event.status === "COMPLETED" || event.status === "REPORTED";

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{event.title}</h1>
          <p className="text-gray-600">
            {event.chapter.name} • {event.type.toLowerCase().replace("_", " ")}
          </p>
        </div>
        <EventStatusPill status={event.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Event Details */}
        <div className="lg:col-span-2">
          <EventDetails event={event} speakers={event.speakers} budgetLines={event.budgetLines} />
        </div>

        {/* Action Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Next Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {event.status === "PLANNED" && (
                <p className="text-sm">Complete event details to generate proposal documents.</p>
              )}
              {event.status === "LIVE" && (
                <p className="text-sm">Event is in progress. Generate attendance sheet.</p>
              )}
              {event.status === "COMPLETED" && (
                <p className="text-sm">Generate post-event report and certificates.</p>
              )}
              {event.status === "REPORTED" && (
                <p className="text-sm">Submit for approval or archive.</p>
              )}
            </CardContent>
          </Card>

          {/* Document Generation - Only show if event is completed */}
          {isCompleted && (
            <DocumentGenerator
              eventId={event.id}
              eventTitle={event.title}
              chapterId={event.chapterId}
            />
          )}

          {/* Approval Status */}
          <Card>
            <CardHeader>
              <CardTitle>Approval Status</CardTitle>
              <CardDescription>Documents awaiting approval</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                No documents submitted for approval yet.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
