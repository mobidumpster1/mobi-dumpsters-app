type BookingItemLike = {
  equipmentItemId: string;
  startDate: Date;
  expectedReturnDate: Date;
  actualReturnDate: Date | null;
  deliveredAt: Date | null;
};

type MaintenanceWindowLike = {
  equipmentItemId: string;
  startDate: Date;
  endDate: Date;
};

export type UtilizationRow = {
  equipmentItemId: string;
  daysReserved: number;
  daysOnRent: number;
  daysOnMaintenance: number;
  utilizationPercent: number;
};

function overlapDays(startA: Date, endA: Date, periodStart: Date, periodEnd: Date): number {
  const overlapStart = Math.max(startA.getTime(), periodStart.getTime());
  const overlapEnd = Math.min(endA.getTime(), periodEnd.getTime());
  if (overlapEnd <= overlapStart) return 0;
  return (overlapEnd - overlapStart) / 86_400_000;
}

// % of the period's calendar days each EquipmentItem was unavailable for
// another job, via interval-overlap math against three separate states
// (T092): reserved (booked but not yet physically delivered — deliveredAt
// still null, so the item is sitting in the yard, not on a job),
// on rent (actually out, from deliveredAt to actualReturnDate/
// expectedReturnDate), and on maintenance (a MaintenanceWindow overlapping
// the period). utilizationPercent sums all three, preserving this report's
// original meaning of "% of the period this item couldn't be booked for
// something else" — now correctly counting maintenance downtime too, which
// the old version ignored entirely. Uses actualReturnDate when it's set (a
// real close-out date), falling back to expectedReturnDate for a still-open
// item. A recently-added item reads as under-utilized since the full period
// is still the denominator — acceptable for a report, not used for billing.
export function computeUtilization(
  bookingItems: BookingItemLike[],
  maintenanceWindows: MaintenanceWindowLike[],
  periodStart: Date,
  periodEnd: Date
): UtilizationRow[] {
  const periodDays = Math.max(
    1,
    (periodEnd.getTime() - periodStart.getTime()) / 86_400_000
  );

  const reservedByItem = new Map<string, number>();
  const onRentByItem = new Map<string, number>();
  const maintenanceByItem = new Map<string, number>();

  for (const item of bookingItems) {
    const rentEnd = item.actualReturnDate ?? item.expectedReturnDate;
    if (item.deliveredAt) {
      const reserved = overlapDays(item.startDate, item.deliveredAt, periodStart, periodEnd);
      if (reserved > 0) {
        reservedByItem.set(item.equipmentItemId, (reservedByItem.get(item.equipmentItemId) ?? 0) + reserved);
      }
      const onRent = overlapDays(item.deliveredAt, rentEnd, periodStart, periodEnd);
      if (onRent > 0) {
        onRentByItem.set(item.equipmentItemId, (onRentByItem.get(item.equipmentItemId) ?? 0) + onRent);
      }
    } else {
      const reserved = overlapDays(item.startDate, rentEnd, periodStart, periodEnd);
      if (reserved > 0) {
        reservedByItem.set(item.equipmentItemId, (reservedByItem.get(item.equipmentItemId) ?? 0) + reserved);
      }
    }
  }

  for (const window of maintenanceWindows) {
    const days = overlapDays(window.startDate, window.endDate, periodStart, periodEnd);
    if (days > 0) {
      maintenanceByItem.set(window.equipmentItemId, (maintenanceByItem.get(window.equipmentItemId) ?? 0) + days);
    }
  }

  const equipmentItemIds = new Set([
    ...reservedByItem.keys(),
    ...onRentByItem.keys(),
    ...maintenanceByItem.keys(),
  ]);

  return Array.from(equipmentItemIds)
    .map((equipmentItemId) => {
      const daysReserved = reservedByItem.get(equipmentItemId) ?? 0;
      const daysOnRent = onRentByItem.get(equipmentItemId) ?? 0;
      const daysOnMaintenance = maintenanceByItem.get(equipmentItemId) ?? 0;
      return {
        equipmentItemId,
        daysReserved,
        daysOnRent,
        daysOnMaintenance,
        utilizationPercent: Math.min(100, ((daysReserved + daysOnRent + daysOnMaintenance) / periodDays) * 100),
      };
    })
    .sort((a, b) => b.utilizationPercent - a.utilizationPercent);
}
