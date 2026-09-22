import { db } from "@/lib/db";

// Used by setBookingVehicle/setBookingDriver (T038): neither used to
// check whether the truck or driver being assigned was already committed
// to another job with overlapping dates — a purely advisory field update,
// so the same vehicle or driver could be double-booked with nothing
// stopping it. "Overlap" compares every not-yet-returned item on this
// booking against every not-yet-returned item on every OTHER
// (non-cancelled) booking that already has this vehicle/driver assigned.
export async function findAssignmentConflict(
  organizationId: string,
  bookingId: string,
  field: "vehicleId" | "driverId",
  resourceId: string
): Promise<string | null> {
  const [thisBooking, otherBookings] = await Promise.all([
    db.booking.findFirstOrThrow({
      where: { id: bookingId, organizationId },
      include: { items: { where: { actualReturnDate: null } } },
    }),
    db.booking.findMany({
      where: {
        organizationId,
        id: { not: bookingId },
        status: { not: "cancelled" },
        [field]: resourceId,
      },
      include: { items: { where: { actualReturnDate: null } }, customer: true },
    }),
  ]);

  for (const other of otherBookings) {
    const overlaps = other.items.some((otherItem) =>
      thisBooking.items.some(
        (thisItem) =>
          thisItem.startDate < otherItem.expectedReturnDate &&
          otherItem.startDate < thisItem.expectedReturnDate
      )
    );
    if (overlaps) {
      return `${other.customer.name}'s booking (${other.deliveryAddress}) has overlapping dates.`;
    }
  }
  return null;
}
