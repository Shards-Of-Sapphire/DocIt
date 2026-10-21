import { requireActiveChapter } from "@/app/_lib/session";
import { EventForm } from "@/components/events/EventForm";

export const metadata = { title: "New Event" };

export default async function NewEventPage() {
  const { active } = await requireActiveChapter();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create event</h1>
        <p className="text-gray-600">Add a new event for {active.chapter.name}</p>
      </div>
      <EventForm chapterId={active.chapterId} />
    </div>
  );
}
