import { db } from "@/lib/db";
import { createEventSchema } from "@/lib/validation/schemas";
import { requireAction } from "./permissions.service";
import { audit } from "./audit.service";
import { z } from "zod";

export class EventService {
  static async create(input: z.infer<typeof createEventSchema>, userId: string) {
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
        tags: parsed.tags || [],
        speakers: parsed.speakers
          ? {
              create: parsed.speakers,
            }
          : undefined,
        budgetLines: parsed.budgetLines
          ? {
              create: parsed.budgetLines,
            }
          : undefined,
      },
      include: { speakers: true, budgetLines: true },
    });

    await audit(userId, "event.created", "Event", event.id, {
      title: event.title,
      type: event.type,
    });

    return event;
  }

  static async update(
    eventId: string,
    input: z.infer<typeof createEventSchema>,
    userId: string
  ) {
    const parsed = createEventSchema.parse(input);
    const actor = await requireAction(parsed.chapterId, "event:update");

    const event = await db.event.update({
      where: { id: eventId },
      data: {
        title: parsed.title,
        type: parsed.type,
        startsAt: parsed.startsAt,
        endsAt: parsed.endsAt,
        venue: parsed.venue,
        objectives: parsed.objectives,
        outcomes: parsed.outcomes,
        participantCount: parsed.participantCount,
        tags: parsed.tags || [],
      },
      include: { speakers: true, budgetLines: true },
    });

    // Handle speakers
    if (parsed.speakers) {
      await db.speaker.deleteMany({ where: { eventId } });
      await db.speaker.createMany({
        data: parsed.speakers.map((s) => ({ ...s, eventId })),
      });
    }

    // Handle budget lines
    if (parsed.budgetLines) {
      await db.budgetLine.deleteMany({ where: { eventId } });
      await db.budgetLine.createMany({
        data: parsed.budgetLines.map((b) => ({ ...b, eventId })),
      });
    }

    await audit(userId, "event.updated", "Event", event.id, { title: event.title });

    return event;
  }

  static async updateStatus(
    eventId: string,
    status: string,
    userId: string
  ) {
    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event) throw new Error("Event not found");

    await requireAction(event.chapterId, "event:update");

    const updated = await db.event.update({
      where: { id: eventId },
      data: { status: status as any },
    });

    await audit(userId, "event.status_updated", "Event", eventId, { status });

    return updated;
  }
}
