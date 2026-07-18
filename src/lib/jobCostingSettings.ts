import { db } from "@/lib/db";

// One row per organization. Created with the default threshold on first
// use, same pattern as getJobNotificationSettings.
export async function getJobCostingSettings(organizationId: string) {
  const existing = await db.jobCostingSettings.findUnique({ where: { organizationId } });
  if (existing) return existing;
  return db.jobCostingSettings.create({ data: { organizationId } });
}
