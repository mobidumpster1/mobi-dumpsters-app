import { db } from "@/lib/db";

// One agreement text per organization. Creates the row with placeholder
// text on first use so Settings always has something to show and edit.
export async function getAgreementSettings(organizationId: string) {
  const existing = await db.serviceAgreementSettings.findUnique({ where: { organizationId } });
  if (existing) return existing;
  return db.serviceAgreementSettings.create({ data: { organizationId } });
}
