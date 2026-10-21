import { db } from "@/lib/db";

export async function audit(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  metadata?: Record<string, any>
) {
  try {
    await db.auditLog.create({
      data: {
        actorId,
        action,
        entity,
        entityId,
        metadata: metadata || {},
      },
    });
  } catch (error) {
    console.error("Audit logging failed:", error);
    // Don't fail the main operation if audit fails
  }
}
