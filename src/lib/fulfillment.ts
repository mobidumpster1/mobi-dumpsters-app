// A completed-or-scheduled delivery/pickup and how it actually went —
// the historical counterpart to Dispatch, which only ever shows today's
// live state. One row per BookingItem leg (delivery, then separately
// pickup once it happens).
export type FulfillmentRow = {
  bookingItemId: string;
  bookingId: string;
  customerName: string;
  equipmentLabel: string;
  driverName: string | null;
  scheduledDelivery: Date;
  actualDelivery: Date | null;
  deliveryStatus: "on_time" | "late" | "pending";
  scheduledPickup: Date;
  actualPickup: Date | null;
  pickupStatus: "on_time" | "late" | "pending";
};

export type FulfillmentSummary = {
  deliveriesCompleted: number;
  deliveriesOnTime: number;
  deliveriesPending: number;
  pickupsCompleted: number;
  pickupsOnTime: number;
  pickupsPending: number;
  // Average lateness in hours, counting only the legs that were actually
  // late (an on-time or still-pending leg contributes nothing here).
  avgDeliveryDelayHours: number | null;
  avgPickupDelayHours: number | null;
};

type BookingItemLike = {
  id: string;
  bookingId: string;
  startDate: Date;
  expectedReturnDate: Date;
  deliveredAt: Date | null;
  pickedUpAt: Date | null;
  equipmentItem: { category: { name: string } };
  booking: { customer: { name: string }; driver: { name: string } | null };
};

function legStatus(scheduled: Date, actual: Date | null): "on_time" | "late" | "pending" {
  if (!actual) return "pending";
  return actual.getTime() <= scheduled.getTime() ? "on_time" : "late";
}

export function computeFulfillmentRows(bookingItems: BookingItemLike[]): FulfillmentRow[] {
  return bookingItems
    .map((item) => ({
      bookingItemId: item.id,
      bookingId: item.bookingId,
      customerName: item.booking.customer.name,
      equipmentLabel: item.equipmentItem.category.name,
      driverName: item.booking.driver?.name ?? null,
      scheduledDelivery: item.startDate,
      actualDelivery: item.deliveredAt,
      deliveryStatus: legStatus(item.startDate, item.deliveredAt),
      scheduledPickup: item.expectedReturnDate,
      actualPickup: item.pickedUpAt,
      pickupStatus: legStatus(item.expectedReturnDate, item.pickedUpAt),
    }))
    .sort((a, b) => b.scheduledDelivery.getTime() - a.scheduledDelivery.getTime());
}

export function summarizeFulfillment(rows: FulfillmentRow[]): FulfillmentSummary {
  let deliveriesCompleted = 0;
  let deliveriesOnTime = 0;
  let deliveriesPending = 0;
  let deliveryDelayHoursTotal = 0;
  let deliveryDelayCount = 0;

  let pickupsCompleted = 0;
  let pickupsOnTime = 0;
  let pickupsPending = 0;
  let pickupDelayHoursTotal = 0;
  let pickupDelayCount = 0;

  for (const row of rows) {
    if (row.deliveryStatus === "pending") {
      deliveriesPending += 1;
    } else {
      deliveriesCompleted += 1;
      if (row.deliveryStatus === "on_time") {
        deliveriesOnTime += 1;
      } else {
        deliveryDelayHoursTotal +=
          (row.actualDelivery!.getTime() - row.scheduledDelivery.getTime()) / 3_600_000;
        deliveryDelayCount += 1;
      }
    }

    if (row.pickupStatus === "pending") {
      pickupsPending += 1;
    } else {
      pickupsCompleted += 1;
      if (row.pickupStatus === "on_time") {
        pickupsOnTime += 1;
      } else {
        pickupDelayHoursTotal +=
          (row.actualPickup!.getTime() - row.scheduledPickup.getTime()) / 3_600_000;
        pickupDelayCount += 1;
      }
    }
  }

  return {
    deliveriesCompleted,
    deliveriesOnTime,
    deliveriesPending,
    pickupsCompleted,
    pickupsOnTime,
    pickupsPending,
    avgDeliveryDelayHours: deliveryDelayCount > 0 ? deliveryDelayHoursTotal / deliveryDelayCount : null,
    avgPickupDelayHours: pickupDelayCount > 0 ? pickupDelayHoursTotal / pickupDelayCount : null,
  };
}
