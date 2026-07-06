import { db } from "@/lib/db";

// There's only ever one row. Created disabled with no URL on first use, so
// Settings always has something to show and edit — same pattern as
// getAgreementSettings.
export async function getReviewRequestSettings() {
  const existing = await db.reviewRequestSettings.findFirst();
  if (existing) return existing;
  return db.reviewRequestSettings.create({ data: {} });
}
