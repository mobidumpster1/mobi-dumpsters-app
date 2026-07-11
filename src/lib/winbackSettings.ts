import { db } from "@/lib/db";

// One row per organization. Created with the default 90-day threshold on
// first use, so both Settings and the Win-Back page always have something
// to read — same pattern as getReviewRequestSettings.
export async function getWinBackSettings(organizationId: string) {
  const existing = await db.winBackSettings.findUnique({ where: { organizationId } });
  if (existing) return existing;
  return db.winBackSettings.create({ data: { organizationId } });
}
