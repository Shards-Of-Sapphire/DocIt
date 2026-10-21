// src/lib/permissions.ts
import type { Role } from "@prisma/client";

type Action =
  | "event:create" | "event:read" | "event:update" | "event:archive"
  | "chapter:manage" | "member:manage"
  | "document:create" | "document:approve"
  | "certificate:generate"
  | "media:upload";

// Least-privilege matrix. Unknown roles fail closed.
export const ROLE_ACTIONS: Record<Role, Set<Action>> = {
  ADMIN:        new Set(["event:create","event:read","event:update","event:archive",
                         "chapter:manage","member:manage","document:create","document:approve",
                         "certificate:generate","media:upload"]),
  CHAIR:        new Set(["event:create","event:read","event:update","event:archive",
                         "document:create","document:approve","certificate:generate","media:upload"]),
  ADVISOR:      new Set(["event:read","event:update","document:approve"]),
  DOCS:         new Set(["event:create","event:read","event:update","event:archive",
                         "document:create","certificate:generate"]),
  CONTRIBUTOR:  new Set(["event:read","media:upload"]),
  VIEWER:       new Set(["event:read"]),
};

export function can(role: Role, action: Action): boolean {
  return ROLE_ACTIONS[role]?.has(action) ?? false;
}
