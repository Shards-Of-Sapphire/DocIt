import { requireActiveChapter, loadEventForUser, notFound } from "@/app/_lib/session";
import { EventForm } from "@/components/events/EventForm";

export const metadata = { title: "Edit Event" };

export default async function EditEventPage({
  params,
}: {
  params: { eventId: string };
}) {
  const { user } = await requireActiveChapter();
  const data = await loadEventForUser(params.eventId, user.id);

  if (!data) notFound();

  const { event } = data;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit event</h1>
        <p className="text-gray-600">{event.title}</p>
      </div>
      <EventForm chapterId={event.chapterId} initialEvent={event} />
    </div>
  );
}
