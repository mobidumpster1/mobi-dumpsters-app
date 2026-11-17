import { db } from "@/lib/db";
import { getPublicOrganizationId } from "@/lib/session";
import { unitFreeAfter } from "@/lib/dumpSchedule";
import { getDumpScheduleSettings } from "@/lib/dumpScheduleSettings";

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
export async function listBookableCategories(organizationId?: string) {
  // Public, unauthenticated callers (the online booking page and SEO city
  // pages) have no session to read an organizationId from, so they fall
  // back to the same single-org placeholder as getPublicOrganizationId
  // itself. Authenticated callers (e.g. Settings, generating widget code)
  // pass their real organizationId directly instead.
  organizationId ??= await getPublicOrganizationId();
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
//
// "Overlap" accounts for the dump-run buffer: a unit isn't really free the
// instant a rental's expectedReturnDate hits — it still has to get dumped
// before it can go back out (see dumpSchedule.ts), unless this category
// dumps at the company's own yard instead (no hour restriction). We buffer
// the *pickup* side of both the requested range and every existing booking
// before comparing, so a unit due back Saturday evening (public dump
// closed) doesn't look bookable again until Monday. Delivery-side dates are
// never buffered — deliveries run 7 days a week regardless.
export async function findAvailableItems(
  categoryId: string,
  startDate: Date,
  endDate: Date,
  // Defaults to the module-level client; pass a `tx` from
  // db.$transaction(...) to re-run this same check as part of a
  // serializable booking-creation transaction (see submitBookingRequest),
  // so Postgres itself can detect two concurrent bookings racing for the
  // same unit instead of both silently succeeding. Typed by the two
  // model accessors actually used below, not the full client shape —
  // Prisma's generated type for an extended client's tx callback doesn't
  // structurally match `typeof db` itself (it omits $transaction/$extends/
  // etc.), and this is all either one actually needs to satisfy.
  client: Pick<typeof db, "equipmentCategory" | "equipmentItem"> = db
) {
  // Same public-caller situation as listBookableCategories above.
  const organizationId = await getPublicOrganizationId();
  const [category, dumpSchedule] = await Promise.all([
    client.equipmentCategory.findUniqueOrThrow({
      where: { id: categoryId },
      select: { dumpsAtOwnYard: true },
    }),
    getDumpScheduleSettings(organizationId),
  ]);
  const bufferedEndDate = unitFreeAfter(endDate, category.dumpsAtOwnYard, dumpSchedule);
  const items = await client.equipmentItem.findMany({
    where: {
      categoryId,
      organizationId,
      status: { notIn: UNBOOKABLE_STATUSES },
    },
    include: {
      // booking.status excludes cancelled bookings — without it, a
      // BookingItem from a declined/cancelled booking (never deleted,
      // never given an actualReturnDate — see declineBooking/
      // cancelBooking) would permanently block its dates from ever being
      // rebooked, even though the equipment item's own status is reset
      // to "available" right alongside it.
      bookingItems: {
        where: {
          actualReturnDate: null,
          startDate: { lt: bufferedEndDate },
          booking: { status: { not: "cancelled" } },
        },
      },
      // Planned maintenance blocks the range like a booking would, but
      // with no dump-run buffer — it's a hard block, not a pickup event.
      maintenanceWindows: {
        where: { startDate: { lt: endDate }, endDate: { gt: startDate } },
      },
    },
  });

  return items.filter(
    (item) =>
      item.maintenanceWindows.length === 0 &&
      item.bookingItems.every(
        (bi) => unitFreeAfter(bi.expectedReturnDate, category.dumpsAtOwnYard, dumpSchedule) <= startDate
      )
  );
}

// Re-verifies a set of SPECIFIC, already-chosen equipment items (as
// opposed to findAvailableItems's "any free item in this category"
// search) are actually still free for their requested dates — the staff
// booking form (createBooking, src/app/(internal)/bookings/actions.ts)
// lets a staff member pick an exact physical unit rather than a category,
// so there's no category-search step to re-run findAvailableItems
// against. Same overlap/buffer/maintenance rules as findAvailableItems,
// just checked per specific item instead of scanning a whole category.
// Pass a `tx` from db.$transaction(..., {isolationLevel: Serializable})
// so two staff members racing for the same specific unit get the same
// Postgres-enforced protection the public booking flow already has (see
// T019) — otherwise the exact same double-booking race stays open on
// this form.
export async function verifySpecificItemsAvailable(
  organizationId: string,
  requests: { equipmentItemId: string; startDate: Date; endDate: Date }[],
  client: Pick<typeof db, "equipmentItem"> = db,
  // When re-checking an existing booking (e.g. after its dates were edited),
  // its own items must not count as conflicting with themselves.
  excludeBookingItemIds: string[] = []
): Promise<void> {
  const dumpSchedule = await getDumpScheduleSettings(organizationId);

  for (const request of requests) {
    const item = await client.equipmentItem.findFirst({
      where: { id: request.equipmentItemId, organizationId },
      include: {
        category: { select: { dumpsAtOwnYard: true, name: true } },
        bookingItems: {
          where: {
            actualReturnDate: null,
            startDate: { lt: request.endDate },
            booking: { status: { not: "cancelled" } },
            ...(excludeBookingItemIds.length > 0 ? { id: { notIn: excludeBookingItemIds } } : {}),
          },
        },
        maintenanceWindows: {
          where: { startDate: { lt: request.endDate }, endDate: { gt: request.startDate } },
        },
      },
    });
    if (!item) {
      throw new Error("One of the selected equipment items no longer exists.");
    }
    if (item.maintenanceWindows.length > 0) {
      throw new Error(`${item.label} has a scheduled maintenance block over these dates — pick another unit.`);
    }
    const stillOverlapping = item.bookingItems.some(
      (bi) =>
        unitFreeAfter(bi.expectedReturnDate, item.category.dumpsAtOwnYard, dumpSchedule) >
        request.startDate
    );
    if (stillOverlapping) {
      throw new Error(`${item.label} was just booked for overlapping dates by someone else — pick another unit.`);
    }
  }
}
