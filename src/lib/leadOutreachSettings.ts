import { db } from "@/lib/db";

// One row per organization. Created with the default 25/day cap on
// first use, same pattern as the other *Settings singletons.
export async function getLeadOutreachSettings(organizationId: string) {
  const existing = await db.leadOutreachSettings.findUnique({ where: { organizationId } });
  if (existing) return existing;
  return db.leadOutreachSettings.create({ data: { organizationId } });
}
