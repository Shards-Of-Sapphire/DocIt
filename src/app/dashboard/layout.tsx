import { requireActiveChapter } from "@/app/_lib/session";
import type { ReactNode } from "react";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { active } = await requireActiveChapter();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{active.chapter.name}</h1>
        <p className="text-gray-600">{active.chapter.parentBody}</p>
      </div>
      {children}
    </div>
  );
}
