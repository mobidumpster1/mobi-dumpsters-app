import { db } from "@/lib/db";

// One row per organization. Created with the default 7am-5pm Mon-Sat
// schedule on first use, same pattern as getJobCostingSettings.
export async function getDumpScheduleSettings(organizationId: string) {
  const existing = await db.dumpScheduleSettings.findUnique({ where: { organizationId } });
  if (existing) return existing;
  return db.dumpScheduleSettings.create({ data: { organizationId } });
}
