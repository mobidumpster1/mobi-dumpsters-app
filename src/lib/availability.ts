import { db } from "@/lib/db";
import { getPublicOrganizationId } from "@/lib/session";

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
  // Public, unauthenticated caller (the online booking page and SEO city
  // pages) — no session to read an organizationId from, so this uses the
  // same single-org placeholder as getPublicOrganizationId itself.
  const organizationId = await getPublicOrganizationId();
  const categories = await db.equipmentCategory.findMany({
    where: { organizationId },
    include: {
      items: { where: { status: { notIn: UNBOOKABLE_STATUSES } } },
      pricingTiers: { orderBy: { sortOrder: "asc" } },
      materialOptions: { orderBy: { sortOrder: "asc" } },
      bundleOfCategory: {
        include: { items: { where: { status: { notIn: UNBOOKABLE_STATUSES } } } },
      },
    },
    orderBy: { name: "asc" },
  });
  return categories.filter((category) => {
    const pool = category.bundleOfCategory ? category.bundleOfCategory.items : category.items;
    const hasEnoughUnits = pool.length >= requiredQuantity(category);
    // Without a base price, a priced tier, or a material price list, a
    // booking request would silently total $0 — hide the category until
    // it's priced rather than let it appear bookable for free.
    const hasPricing =
      category.basePrice !== null ||
      category.pricingTiers.some((tier) => tier.price !== null) ||
      category.materialOptions.length > 0;
    return hasEnoughUnits && hasPricing;
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
  // Same public-caller situation as listBookableCategories above.
  const organizationId = await getPublicOrganizationId();
  const items = await db.equipmentItem.findMany({
    where: {
      categoryId,
      organizationId,
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
