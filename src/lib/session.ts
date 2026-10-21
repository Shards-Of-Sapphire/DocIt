import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const ACTIVE_CHAPTER_COOKIE = "activeChapter";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
  };
}

export async function getChapterContext(userId: string) {
  const memberships = await db.membership.findMany({
    where: { userId },
    include: { chapter: true },
    orderBy: { chapter: { name: "asc" } },
  });
  const cookieId = (await cookies()).get(ACTIVE_CHAPTER_COOKIE)?.value;
  const active = memberships.find((m) => m.chapterId === cookieId) ?? memberships[0] ?? null;
  return { memberships, active };
}

export async function requireActiveChapter() {
  const user = await requireUser();
  const { memberships, active } = await getChapterContext(user.id);
  if (!active) redirect("/onboarding");
  return { user, memberships, active };
}

export async function loadEventForUser(eventId: string, userId: string) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      chapter: true,
      speakers: true,
      budgetLines: true,
      documents: {
        include: { versions: { orderBy: { generatedAt: "desc" }, take: 1 } },
      },
    },
  });
  if (!event) return null;

  const membership = await db.membership.findUnique({
    where: { userId_chapterId: { userId, chapterId: event.chapterId } },
  });
  if (!membership) return null;

  return { event, membership };
}

export { notFound };
