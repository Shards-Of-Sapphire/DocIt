import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireActiveChapter } from "@/app/_lib/session";

export async function GET() {
  const { active } = await requireActiveChapter();

  const events = await db.event.findMany({
    where: { chapterId: active.chapterId },
    orderBy: { startsAt: 'desc' },
    include: { _count: { select: { documents: true } } }
  });

  const headers = ["Title", "Type", "Date", "Venue", "Status", "Participants", "Docs Count"];
  const rows = events.map(e => [
    `"${e.title.replace(/"/g, '""')}"`,
    e.type,
    e.startsAt.toISOString().split('T')[0],
    `"${(e.venue || "").replace(/"/g, '""')}"`,
    e.status,
    e.participantCount || 0,
    e._count.documents
  ]);

  const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="events-export-${active.chapter.name}.csv"`,
    },
  });
}
