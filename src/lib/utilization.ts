type BookingItemLike = {
  equipmentItemId: string;
  startDate: Date;
  expectedReturnDate: Date;
  actualReturnDate: Date | null;
};

export type UtilizationRow = {
  equipmentItemId: string;
  daysOnRent: number;
  utilizationPercent: number;
};

// % of the period's calendar days each EquipmentItem was on-rent, via
// interval-overlap math — an item on-rent every day of the period reads
// 100%. Uses actualReturnDate when it's set (a real close-out date), and
// falls back to expectedReturnDate for a still-open item. A recently-added
// item reads as under-utilized since the full period is still the
// denominator — acceptable for a report, not used for billing.
export function computeUtilization(
  bookingItems: BookingItemLike[],
  periodStart: Date,
  periodEnd: Date
): UtilizationRow[] {
  const periodDays = Math.max(
    1,
    (periodEnd.getTime() - periodStart.getTime()) / 86_400_000
  );

  const daysByItem = new Map<string, number>();
  for (const item of bookingItems) {
    const rentEnd = item.actualReturnDate ?? item.expectedReturnDate;
    const overlapStart = Math.max(item.startDate.getTime(), periodStart.getTime());
    const overlapEnd = Math.min(rentEnd.getTime(), periodEnd.getTime());
    if (overlapEnd <= overlapStart) continue;
    const overlapDays = (overlapEnd - overlapStart) / 86_400_000;
    daysByItem.set(
      item.equipmentItemId,
      (daysByItem.get(item.equipmentItemId) ?? 0) + overlapDays
    );
  }

  return Array.from(daysByItem.entries())
    .map(([equipmentItemId, daysOnRent]) => ({
      equipmentItemId,
      daysOnRent,
      utilizationPercent: Math.min(100, (daysOnRent / periodDays) * 100),
    }))
    .sort((a, b) => b.utilizationPercent - a.utilizationPercent);
}
