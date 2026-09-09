import { db } from "@/lib/db";

// Counts every item ever created in the category (including retired ones
// — there's no hard-delete for equipment) so a number never gets reused,
// even if older units are retired later.
export async function nextAssetTag(categoryId: string, prefix: string): Promise<string> {
  const count = await db.equipmentItem.count({ where: { categoryId } });
  return `${prefix}-${String(count + 1).padStart(3, "0")}`;
}
