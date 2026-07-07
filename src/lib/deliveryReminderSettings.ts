import { db } from "@/lib/db";

// There's only ever one row. Created disabled with defaults on first use,
// same pattern as getReviewRequestSettings.
export async function getDeliveryReminderSettings() {
  const existing = await db.deliveryReminderSettings.findFirst();
  if (existing) return existing;
  return db.deliveryReminderSettings.create({ data: {} });
}
