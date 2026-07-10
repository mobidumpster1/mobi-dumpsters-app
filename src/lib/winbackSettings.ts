import { db } from "@/lib/db";

// There's only ever one row. Created with the default 90-day threshold on
// first use, so both Settings and the Win-Back page always have something
// to read — same pattern as getReviewRequestSettings.
export async function getWinBackSettings() {
  const existing = await db.winBackSettings.findFirst();
  if (existing) return existing;
  return db.winBackSettings.create({ data: {} });
}
