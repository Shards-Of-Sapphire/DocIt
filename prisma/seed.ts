// prisma/seed.ts (abridged)
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const chapter = await db.chapter.create({
    data: { name: "IEEE SIGHT MJCET", parentBody: "IEEE SIGHT", academicYear: "2026-27" },
  });
  const chair = await db.user.create({ data: { name: "Sample Chair", email: "chair@example.com" } });
  const docs  = await db.user.create({ data: { name: "Sample Docs Lead", email: "docs@example.com" } });
  await db.membership.createMany({
    data: [
      { userId: chair.id, chapterId: chapter.id, role: "CHAIR" },
      { userId: docs.id,  chapterId: chapter.id, role: "DOCS" },
    ],
  });
  // A sample event so new users see a populated screen
  await db.event.create({
    data: {
      chapterId: chapter.id,
      title: "Intro to Embedded Systems Workshop",
      type: "WORKSHOP",
      startsAt: new Date("2026-11-02T10:00:00Z"),
      endsAt: new Date("2026-11-02T16:00:00Z"),
      venue: "Seminar Hall 2",
      objectives: "Introduce first-year students to microcontrollers.",
    },
  });
}
main().finally(() => db.$disconnect());
