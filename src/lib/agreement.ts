import { db } from "@/lib/db";

// There's only ever one agreement text at a time. Creates the row with
// placeholder text on first use so Settings always has something to show
// and edit.
export async function getAgreementSettings() {
  const existing = await db.serviceAgreementSettings.findFirst();
  if (existing) return existing;
  return db.serviceAgreementSettings.create({ data: {} });
}
