import { db } from "@/lib/db";

// One row per organization. Created disabled on first use, same pattern
// as getReviewRequestSettings.
export async function getJobNotificationSettings(organizationId: string) {
  const existing = await db.jobNotificationSettings.findUnique({ where: { organizationId } });
  if (existing) return existing;
  return db.jobNotificationSettings.create({ data: { organizationId } });
}
