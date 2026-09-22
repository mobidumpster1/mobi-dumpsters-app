import { Prisma } from "@/generated/prisma";

export function computeBookingStatus(
  items: { deliveredAt: Date | null; actualReturnDate: Date | null }[]
): "Completed" | "In Progress" | "Scheduled" {
  if (items.length > 0 && items.every((i) => i.actualReturnDate)) {
    return "Completed";
  }
  if (items.some((i) => i.deliveredAt)) return "In Progress";
  return "Scheduled";
}

// The SQL-side equivalent of computeBookingStatus (plus the pending/
// cancelled cases the bookings list page layers on top of it), for
// filtering/counting server-side (T180) instead of fetching every booking
// and filtering in memory. Assumes actualReturnDate is only ever set on an
// item that was already delivered — true of every write path in
// (internal)/bookings/actions.ts today — so "scheduled" can be identified
// by "nothing delivered yet" without a more convoluted NOT-completed check.
export function bookingStatusFilter(displayStatus: string): Prisma.BookingWhereInput {
  switch (displayStatus) {
    case "pending":
      return { status: "pending" };
    case "cancelled":
      return { status: "cancelled" };
    case "completed":
      return {
        status: { notIn: ["pending", "cancelled"] },
        AND: [{ items: { some: {} } }, { items: { every: { actualReturnDate: { not: null } } } }],
      };
    case "in_progress":
      return {
        status: { notIn: ["pending", "cancelled"] },
        AND: [
          { items: { some: { deliveredAt: { not: null } } } },
          { items: { some: { actualReturnDate: null } } },
        ],
      };
    case "scheduled":
      return {
        status: { notIn: ["pending", "cancelled"] },
        items: { none: { deliveredAt: { not: null } } },
      };
    default:
      return {};
  }
}
