import { db } from "@/lib/db";

// One row per organization. Created disabled/0% on first use, same pattern
// as getDumpScheduleSettings.
export async function getTaxSettings(organizationId: string) {
  const existing = await db.taxSettings.findUnique({ where: { organizationId } });
  if (existing) return existing;
  return db.taxSettings.create({ data: { organizationId } });
}
