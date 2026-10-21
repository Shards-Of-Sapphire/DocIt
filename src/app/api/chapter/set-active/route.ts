import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACTIVE_CHAPTER_COOKIE } from "@/app/_lib/session";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const chapterId = String(form.get("chapterId") ?? "");

  // Only switch to a chapter the user actually belongs to.
  const membership = await db.membership.findUnique({
    where: { userId_chapterId: { userId: session.user.id, chapterId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  (await cookies()).set(ACTIVE_CHAPTER_COOKIE, chapterId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ ok: true });
}
