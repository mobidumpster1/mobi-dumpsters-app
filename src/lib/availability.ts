import { db } from "@/lib/db";

const UNBOOKABLE_STATUSES = ["retired", "needs_repair"];

// A "bundle" category (e.g. "40 Yard — Two Containers") doesn't own any
// equipment itself — it books `bundleQuantity` units from another category
// (e.g. 2 Roll-Off Dumpsters). These helpers resolve that indirection so
// the rest of the booking flow can mostly ignore it.
export function effectiveCategoryId(category: {
  id: string;
  bundleOfCategoryId: string | null;
}) {
  return category.bundleOfCategoryId ?? category.id;
}

export function requiredQuantity(category: { bundleOfCategoryId: string | null; bundleQuantity: number }) {
  return category.bundleOfCategoryId ? category.bundleQuantity : 1;
}

// Categories that currently have enough active, working units to be worth
// showing on the public booking page (accounting for bundle quantity).
export async function listBookableCategories() {
  const categories = await db.equipmentCategory.findMany({
    include: {
      items: { where: { status: { notIn: UNBOOKABLE_STATUSES } } },
      pricingTiers: { orderBy: { sortOrder: "asc" } },
      bundleOfCategory: {
        include: { items: { where: { status: { notIn: UNBOOKABLE_STATUSES } } } },
      },
    },
    orderBy: { name: "asc" },
  });
  return categories.filter((category) => {
    const pool = category.bundleOfCategory ? category.bundleOfCategory.items : category.items;
    return pool.length >= requiredQuantity(category);
  });
}

// Equipment items in a category that are free for the requested date
// range: not retired or needing repair, and with no existing (not-yet-
// returned) booking whose dates overlap the request.
export async function findAvailableItems(
  categoryId: string,
  startDate: Date,
  endDate: Date
) {
  const items = await db.equipmentItem.findMany({
    where: {
      categoryId,
      status: { notIn: UNBOOKABLE_STATUSES },
    },
    include: {
      bookingItems: {
        where: {
          actualReturnDate: null,
          startDate: { lt: endDate },
          expectedReturnDate: { gt: startDate },
        },
      },
    },
  });

  return items.filter((item) => item.bookingItems.length === 0);
}
