import { db } from "@/lib/db";

// One row per organization. Created disabled with no URL on first use, so
// Settings always has something to show and edit — same pattern as
// getAgreementSettings.
export async function getReviewRequestSettings(organizationId: string) {
  const existing = await db.reviewRequestSettings.findUnique({ where: { organizationId } });
  if (existing) return existing;
  return db.reviewRequestSettings.create({ data: { organizationId } });
}
