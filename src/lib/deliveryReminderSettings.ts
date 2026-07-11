import { db } from "@/lib/db";

// One row per organization. Created disabled with defaults on first use,
// same pattern as getReviewRequestSettings.
export async function getDeliveryReminderSettings(organizationId: string) {
  const existing = await db.deliveryReminderSettings.findUnique({ where: { organizationId } });
  if (existing) return existing;
  return db.deliveryReminderSettings.create({ data: { organizationId } });
}
