import { db } from "@/lib/db";

// There's only ever one row. Created disabled on first use, same pattern
// as getReviewRequestSettings.
export async function getJobNotificationSettings() {
  const existing = await db.jobNotificationSettings.findFirst();
  if (existing) return existing;
  return db.jobNotificationSettings.create({ data: {} });
}
