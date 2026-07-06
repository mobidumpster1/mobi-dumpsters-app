import { db } from "@/lib/db";

// There's only ever one row. Created disabled with defaults on first use,
// same pattern as getReviewRequestSettings.
export async function getInvoiceReminderSettings() {
  const existing = await db.invoiceReminderSettings.findFirst();
  if (existing) return existing;
  return db.invoiceReminderSettings.create({ data: {} });
}
