import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";

export type Action =
  | "event:create" | "event:read" | "event:update" | "event:archive"
  | "chapter:manage" | "member:manage"
  | "document:create" | "document:approve" | "document:submit"
  | "certificate:generate"
  | "media:upload";

const ROLE_ACTIONS: Record<Role, Set<Action>> = {
  // Chair: admin powers and the only approver
  CHAIR: new Set<Action>([
    "event:create", "event:read", "event:update", "event:archive",
    "chapter:manage", "member:manage",
    "document:create", "document:approve", "document:submit",
    "certificate:generate", "media:upload",
  ]),
  DOCS: new Set<Action>([
    "event:create", "event:read", "event:update", "event:archive",
    "document:create", "document:submit",
    "certificate:generate",
  ]),
  CONTRIBUTOR: new Set<Action>(["event:read", "media:upload"]),
  VIEWER: new Set<Action>(["event:read"]),
};

export class PermissionError extends Error {
  constructor(public status = 403) {
    super("Not allowed.");
  }
}

export function can(role: Role, action: Action): boolean {
  return ROLE_ACTIONS[role]?.has(action) ?? false;
}

export async function requireMember(chapterId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new PermissionError(401);

  const membership = await db.membership.findUnique({
    where: { userId_chapterId: { userId: session.user.id, chapterId } },
  });
  if (!membership) throw new PermissionError();
  return membership;
}

export async function requireAction(chapterId: string, action: Action) {
  const m = await requireMember(chapterId);
  if (!can(m.role, action)) throw new PermissionError();
  return m;
}
