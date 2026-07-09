import "server-only";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

// Records who did a sensitive action, for accountability — append-only,
// never edited or deleted alongside the user (see AuditLog model comment).
// Best-effort: a logging failure shouldn't block the real action from
// completing, so this never throws.
export async function logAction(action: string, entity: string, entityId?: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    await db.auditLog.create({
      data: { userId: user.id, action, entity, entityId },
    });
  } catch (error) {
    console.error("Failed to write audit log entry:", error);
  }
}
