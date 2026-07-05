import { db } from "@/lib/db";

const UNBOOKABLE_STATUSES = ["retired", "needs_repair"];

// Categories that currently have at least one active, working unit, i.e.
// the ones worth showing on the public booking page.
export async function listBookableCategories() {
  const categories = await db.equipmentCategory.findMany({
    include: { items: { where: { status: { notIn: UNBOOKABLE_STATUSES } } } },
    orderBy: { name: "asc" },
  });
  return categories.filter((category) => category.items.length > 0);
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
