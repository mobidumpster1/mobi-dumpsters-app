"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { unitFreeAfter } from "@/lib/dumpSchedule";
import { getDumpScheduleSettings } from "@/lib/dumpScheduleSettings";

function startOfDayUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// Drag-and-drop reschedule from the calendar's week view. Dragging a
// delivery card shifts the whole rental (start and end move together,
// same duration, same time-of-day) — dragging a return card only moves
// the end date, since the customer already has the equipment.
export async function rescheduleBookingItem(
  bookingItemId: string,
  kind: "delivery" | "return",
  newDateStr: string
) {
  const user = await requireUser();
  const [item, dumpSchedule] = await Promise.all([
    db.bookingItem.findFirstOrThrow({
      where: { id: bookingItemId, booking: { organizationId: user.effectiveOrganizationId } },
      include: { equipmentItem: { select: { category: { select: { dumpsAtOwnYard: true } } } } },
    }),
    getDumpScheduleSettings(user.effectiveOrganizationId),
  ]);
  const dumpsAtOwnYard = item.equipmentItem.category.dumpsAtOwnYard;

  const newDate = new Date(`${newDateStr}T00:00:00.000Z`);
  if (Number.isNaN(newDate.getTime())) throw new Error("Invalid date.");

  let newStartDate = item.startDate;
  let newExpectedReturnDate = item.expectedReturnDate;

  if (kind === "delivery") {
    const deltaMs = newDate.getTime() - startOfDayUTC(item.startDate).getTime();
    newStartDate = new Date(item.startDate.getTime() + deltaMs);
    newExpectedReturnDate = new Date(item.expectedReturnDate.getTime() + deltaMs);
  } else {
    const timeOfDayMs =
      item.expectedReturnDate.getTime() - startOfDayUTC(item.expectedReturnDate).getTime();
    newExpectedReturnDate = new Date(newDate.getTime() + timeOfDayMs);
    if (newExpectedReturnDate < item.startDate) {
      throw new Error("Return date can't be before the delivery date.");
    }
  }

  // Only checked against OTHER bookings on the same physical unit — this
  // item's own current reservation obviously "conflicts" with itself.
  //
  // Overlap accounts for the dump-run buffer on both sides: neither this
  // item's new pickup nor an existing booking's pickup counts as freeing
  // the unit until the next time the dump is actually open (see
  // dumpSchedule.ts) — a Saturday-evening pickup doesn't free the unit
  // again until Monday, unless this category dumps at the company's own
  // yard instead. Every candidate shares this item's equipmentItemId, so
  // they're all the same category — one flag applies to both sides.
  const bufferedNewReturn = unitFreeAfter(newExpectedReturnDate, dumpsAtOwnYard, dumpSchedule);
  const candidates = await db.bookingItem.findMany({
    where: {
      id: { not: bookingItemId },
      equipmentItemId: item.equipmentItemId,
      actualReturnDate: null,
      startDate: { lt: bufferedNewReturn },
    },
  });
  const conflict = candidates.find(
    (c) => unitFreeAfter(c.expectedReturnDate, dumpsAtOwnYard, dumpSchedule) > newStartDate
  );
  if (conflict) {
    throw new Error("That would overlap with another booking already using this equipment — the dump isn't open in time to free it up.");
  }

  await db.bookingItem.update({
    where: { id: bookingItemId },
    data: { startDate: newStartDate, expectedReturnDate: newExpectedReturnDate },
  });

  revalidatePath("/calendar");
  revalidatePath(`/bookings/${item.bookingId}`);
}
