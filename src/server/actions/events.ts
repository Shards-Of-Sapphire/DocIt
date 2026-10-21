// src/server/actions/events.ts
"use server";
import { requireAction } from "@/server/services/permissions.service";
import { audit } from "@/server/services/audit.service";
import { createEventSchema } from "@/lib/validation/schemas";
import { db } from "@/lib/db";

export async function createEvent(input: unknown) {
  const parsed = createEventSchema.parse(input);
  const actor = await requireAction(parsed.chapterId, "event:create");

  const event = await db.event.create({
    data: {
      chapterId: parsed.chapterId,
      title: parsed.title,
      type: parsed.type,
      startsAt: parsed.startsAt,
      endsAt: parsed.endsAt,
      venue: parsed.venue,
      objectives: parsed.objectives,
      outcomes: parsed.outcomes,
      participantCount: parsed.participantCount,
      tags: parsed.tags,
      speakers: parsed.speakers ? { create: parsed.speakers } : undefined,
      budgetLines: parsed.budgetLines ? { create: parsed.budgetLines } : undefined,
    },
    include: { speakers: true, budgetLines: true },
  });

  await audit(actor.userId, "event.created", "Event", event.id);
  return event;
}
