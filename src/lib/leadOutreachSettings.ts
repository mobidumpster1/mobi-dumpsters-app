import { db } from "@/lib/db";

// There's only ever one row. Created with the default 25/day cap on
// first use, same pattern as the other *Settings singletons.
export async function getLeadOutreachSettings() {
  const existing = await db.leadOutreachSettings.findFirst();
  if (existing) return existing;
  return db.leadOutreachSettings.create({ data: {} });
}
