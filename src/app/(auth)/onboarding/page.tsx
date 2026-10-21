import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACTIVE_CHAPTER_COOKIE } from "@/app/_lib/session";

export const metadata: Metadata = { title: "Welcome to DocIt" };

const PARENT_BODIES = ["IEEE SIGHT", "IEEE SMC", "IEEE GRSS", "CSI", "NSS", "Other"];

async function joinOrCreateChapter(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const mode = formData.get("mode");
  let chapterId: string | null = null;

  if (mode === "join") {
    const id = String(formData.get("chapterId") ?? "");
    const chapter = id ? await db.chapter.findUnique({ where: { id } }) : null;
    if (!chapter) redirect("/onboarding");

    // Keeps any existing role; new members start as CONTRIBUTOR.
    await db.membership.upsert({
      where: { userId_chapterId: { userId, chapterId: chapter.id } },
      update: { termEnd: null },
      create: { userId, chapterId: chapter.id, role: "CONTRIBUTOR" },
    });
    chapterId = chapter.id;
  }

  if (mode === "create") {
    const name = String(formData.get("chapterName") ?? "").trim();
    const parentBody = String(formData.get("parentBody") ?? "").trim();
    if (name.length < 3 || parentBody.length < 3) redirect("/onboarding");

    const year = new Date().getFullYear();
    const chapter = await db.chapter.create({
      data: { name, parentBody, academicYear: `${year}-${year + 1}` },
    });
    // The person who creates the chapter becomes its chair.
    await db.membership.create({
      data: { userId, chapterId: chapter.id, role: "CHAIR" },
    });
    chapterId = chapter.id;
  }

  if (chapterId) {
    (await cookies()).set(ACTIVE_CHAPTER_COOKIE, chapterId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  redirect("/dashboard");
}

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const existingChapters = await db.chapter.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="card">
      <div className="card-header">
        <h1 className="card-title">Welcome to DocIt</h1>
        <p className="card-description">Join or create a chapter to get started</p>
      </div>
      <div className="card-content space-y-6">
        {existingChapters.length > 0 && (
          <form action={joinOrCreateChapter} className="space-y-3">
            <input type="hidden" name="mode" value="join" />
            <h3 className="font-semibold">Join an existing chapter</h3>
            <select name="chapterId" required className="input" defaultValue="">
              <option value="" disabled>Select a chapter...</option>
              {existingChapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name} ({ch.parentBody})
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary w-full">Join</button>
          </form>
        )}

        {existingChapters.length > 0 && (
          <div className="border-t pt-6">
            <p className="text-center text-sm text-gray-500">or</p>
          </div>
        )}

        <form action={joinOrCreateChapter} className="space-y-3">
          <input type="hidden" name="mode" value="create" />
          <h3 className="font-semibold">Create a new chapter</h3>
          <p className="text-xs text-gray-500">You will be the chair of this chapter.</p>
          <input
            type="text"
            name="chapterName"
            placeholder="Chapter name (e.g., IEEE SIGHT MJCET)"
            required
            minLength={3}
            className="input"
          />
          <select name="parentBody" required className="input" defaultValue="">
            <option value="" disabled>Select parent body...</option>
            {PARENT_BODIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary w-full">Create chapter</button>
        </form>
      </div>
    </div>
  );
}
