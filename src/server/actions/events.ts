"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createEventSchema } from "@/lib/validation/schemas";
import { EventService } from "@/server/services/events.service";
import { PermissionError } from "@/server/services/permissions.service";
import { requireActiveChapter, loadEventForUser } from "@/app/_lib/session";

export type EventFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

/** datetime-local has no timezone. Chapters are in India, so treat input as IST. */
function istDate(value: string) {
  return value.length === 16 ? `${value}:00+05:30` : value;
}

function parseForm(fd: FormData) {
  const str = (key: string) => String(fd.get(key) ?? "").trim();
  const opt = (key: string) => (str(key) === "" ? undefined : str(key));

  let speakers: any[];
  let budgetLines: any[];
  try {
    speakers = JSON.parse(str("speakers") || "[]");
    budgetLines = JSON.parse(str("budgetLines") || "[]");
  } catch {
    return { error: "The form data was malformed. Please try again." } as const;
  }

  const participantRaw = opt("participantCount");

  return {
    input: {
      title: str("title"),
      type: str("type"),
      startsAt: istDate(str("startsAt")),
      endsAt: istDate(str("endsAt")),
      venue: opt("venue"),
      objectives: opt("objectives"),
      outcomes: opt("outcomes"),
      participantCount: participantRaw === undefined ? undefined : Number(participantRaw),
      tags: (opt("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      speakers: speakers
        .filter((s) => s?.name?.trim())
        .map((s) => ({
          name: String(s.name).trim(),
          designation: s.designation?.trim() || undefined,
          bio: s.bio?.trim() || undefined,
        })),
      budgetLines: budgetLines
        .filter((b) => b?.item?.trim())
        .map((b) => ({
          item: String(b.item).trim(),
          amount: Number(b.amount), // rupees, up to 2 decimals
          notes: b.notes?.trim() || undefined,
        })),
    },
  } as const;
}

function toFieldErrors(err: z.ZodError): EventFormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { fieldErrors, error: "Please fix the highlighted fields." };
}

export async function createEventAction(
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const { user, active } = await requireActiveChapter();

  const parsed = parseForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const result = createEventSchema.safeParse({
    ...parsed.input,
    chapterId: active.chapterId,
  });
  if (!result.success) return toFieldErrors(result.error);

  let eventId: string;
  try {
    const event = await EventService.create(result.data, user.id);
    eventId = event.id;
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "You don't have permission to create events." };
    }
    console.error("createEventAction failed:", err);
    return { error: "Could not save the event. Please try again." };
  }

  redirect(`/events/${eventId}`);
}

export async function updateEventAction(
  eventId: string,
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const { user } = await requireActiveChapter();

  // Use the event's own chapter, never a chapter id from the form.
  const data = await loadEventForUser(eventId, user.id);
  if (!data) return { error: "Event not found." };

  const parsed = parseForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const result = createEventSchema.safeParse({
    ...parsed.input,
    chapterId: data.event.chapterId,
  });
  if (!result.success) return toFieldErrors(result.error);

  try {
    await EventService.update(eventId, result.data, user.id);
  } catch (err) {
    if (err instanceof PermissionError) {
      return { error: "You don't have permission to edit this event." };
    }
    console.error("updateEventAction failed:", err);
    return { error: "Could not save the event. Please try again." };
  }

  redirect(`/events/${eventId}`);
}

export async function archiveEventAction(eventId: string) {
  const { user } = await requireActiveChapter();
  
  // Verify permissions via the existing service
  const data = await loadEventForUser(eventId, user.id);
  if (!data || data.membership.role !== 'CHAIR') {
    throw new Error("Only the Chair can archive events.");
  }

  await db.event.update({
    where: { id: eventId },
    data: { status: 'ARCHIVED' },
  });

  redirect("/events");
}
