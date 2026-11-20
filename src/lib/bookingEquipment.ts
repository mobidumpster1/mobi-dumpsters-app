import "server-only";
import { db } from "@/lib/db";
import { verifySpecificItemsAvailable } from "@/lib/availability";

// A booking made by accepting a quote starts with no equipment and no dates, so
// it never shows on the calendar, driver view or dashboard (all of those are
// driven by equipment). This gives such a booking its first unit and dates.
// Only for a booking that has no equipment yet: changing existing equipment
// stays on the Edit page.
export async function addFirstEquipmentToBooking(
  organizationId: string,
  bookingId: string,
  input: { equipmentItemId: string; startDate: string; endDate: string; price: number }
) {
  const booking = await db.booking.findFirst({
    where: { id: bookingId, organizationId },
    include: { items: true },
  });
  if (!booking) throw new Error("That booking wasn't found.");
  if (booking.status === "cancelled") throw new Error("This booking is cancelled.");
  if (booking.items.length > 0) throw new Error("This booking already has equipment. Change it from Edit.");

  const dayRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!dayRe.test(input.startDate) || !dayRe.test(input.endDate)) throw new Error("Choose a delivery date and a pickup date.");
  // Wall-clock-as-UTC, the same convention as the rest of the app.
  const start = new Date(`${input.startDate}T09:00:00.000Z`);
  const end = new Date(`${input.endDate}T17:00:00.000Z`);
  if (end <= start) throw new Error("The pickup date must be after the delivery date.");
  if (!(input.price >= 0)) throw new Error("Enter a price (0 if it's already agreed).");

  const unit = await db.equipmentItem.findFirst({
    where: { id: input.equipmentItemId, organizationId, status: { notIn: ["retired", "needs_repair"] } },
    select: { id: true },
  });
  if (!unit) throw new Error("Pick a unit that's in service.");

  await verifySpecificItemsAvailable(organizationId, [{ equipmentItemId: unit.id, startDate: start, endDate: end }], db);

  await db.bookingItem.create({
    data: { bookingId, equipmentItemId: unit.id, startDate: start, expectedReturnDate: end, price: input.price },
  });
  if (booking.status === "confirmed") {
    await db.equipmentItem.updateMany({
      where: { id: unit.id, organizationId },
      data: { status: "reserved", currentCustomerId: booking.customerId, currentLocation: booking.deliveryAddress },
    });
  }
  return booking;
}
