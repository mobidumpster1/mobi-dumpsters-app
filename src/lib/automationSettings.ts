import { db } from "@/lib/db";

// One row per organization. Created with the default cap on first use,
// same pattern as getJobCostingSettings.
export async function getAutomationSettings(organizationId: string) {
  const existing = await db.automationSettings.findUnique({ where: { organizationId } });
  if (existing) return existing;
  return db.automationSettings.create({ data: { organizationId } });
}
