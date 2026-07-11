import { db } from "@/lib/db";

// One row per organization. Created disabled with defaults on first use,
// same pattern as getReviewRequestSettings.
export async function getInvoiceReminderSettings(organizationId: string) {
  const existing = await db.invoiceReminderSettings.findUnique({ where: { organizationId } });
  if (existing) return existing;
  return db.invoiceReminderSettings.create({ data: { organizationId } });
}
