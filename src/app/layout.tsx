import "./globals.css";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { getChapterContext, requireUser } from "@/app/_lib/session";

export const metadata: Metadata = {
  title: { default: "DocIt", template: "%s · DocIt" },
  description: "Event documentation for student chapter teams.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const ctx = session?.user?.id ? await getChapterContext(session.user.id) : null;

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {ctx?.active && (
          <header className="sticky top-0 z-40 border-b bg-white">
            <nav className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
              <Link href="/dashboard" className="text-lg font-bold">
                DocIt
              </Link>
              <div className="flex gap-6 text-sm font-medium">
                <Link href="/events" className="hover:text-blue-600">
                  Events
                </Link>
                <Link href="/settings" className="hover:text-blue-600">
                  Settings
                </Link>
              </div>
              <div className="ml-auto flex items-center gap-4">
                {ctx.memberships.length > 1 && (
                  <select
                    defaultValue={ctx.active.chapterId}
                    onChange={(e) => {
                      const form = new FormData();
                      form.set("chapterId", e.target.value);
                      fetch("/api/chapter/set-active", {
                        method: "POST",
                        body: form,
                      }).then(() => window.location.reload());
                    }}
                    className="rounded border border-gray-300 px-2 py-1 text-sm"
                  >
                    {ctx.memberships.map((m) => (
                      <option key={m.chapterId} value={m.chapterId}>
                        {m.chapter.name}
                      </option>
                    ))}
                  </select>
                )}
                <span className="text-sm text-gray-600">{session?.user?.email}</span>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                >
                  <button type="submit" className="text-sm text-red-600 hover:underline">
                    Sign out
                  </button>
                </form>
              </div>
            </nav>
          </header>
        )}
        <main>{children}</main>
      </body>
    </html>
  );
}
