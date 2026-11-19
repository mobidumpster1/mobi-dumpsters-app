import { db } from "@/lib/db";
import { verifySpecificItemsAvailable } from "@/lib/availability";
import { syncInvoiceWithBooking } from "@/lib/invoicing";

// Moves the return date out by a whole number of days for everything on the
// booking that hasn't come back yet. The invoice then picks up the extra days
// by itself (extra days are billed only when the agreed return date moves
// past the included days — see invoicing.ts).
export async function extendBookingDates(organizationId: string, bookingId: string, days: number) {
  if (!Number.isInteger(days) || days < 1 || days > 60) {
    throw new Error("Enter a whole number of days between 1 and 60");
  }
  const booking = await db.booking.findFirstOrThrow({
    where: { id: bookingId, organizationId },
    include: { items: true },
  });
  if (booking.status === "cancelled") throw new Error("This booking is cancelled");
  const open = booking.items.filter((item) => item.actualReturnDate === null);
  if (open.length === 0) throw new Error("Everything on this booking has already been returned");

  const shifted = open.map((item) => {
    const end = new Date(item.expectedReturnDate);
    end.setUTCDate(end.getUTCDate() + days);
    return { item, end };
  });

  // The extra days must not run into someone else's reservation of the same
  // unit; the booking's own items don't count against themselves.
  await verifySpecificItemsAvailable(
    organizationId,
    shifted.map(({ item, end }) => ({
      equipmentItemId: item.equipmentItemId,
      startDate: item.startDate,
      endDate: end,
    })),
    db,
    booking.items.map((item) => item.id)
  );

  for (const { item, end } of shifted) {
    await db.bookingItem.update({ where: { id: item.id }, data: { expectedReturnDate: end } });
  }
  await syncInvoiceWithBooking(bookingId);
  return booking;
}
