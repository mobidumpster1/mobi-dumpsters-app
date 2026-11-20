// The booking edit form only has date pickers, but delivery and pickup have a
// time of day too (an online booking asks for one). Saving the form must not
// wipe that time to midnight just because the form couldn't show it.

// The date a person typed ("YYYY-MM-DD") applied to an existing date-time: the
// same time of day on the new day, or the untouched original when the day is
// the same. Anything that isn't a clean date falls back to the original.
export function keepTimeOfDay(typed: string | null | undefined, existing: Date): Date {
  const day = typed?.trim().slice(0, 10);
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return existing;
  if (day === existing.toISOString().slice(0, 10)) return existing;
  const moved = new Date(`${day}T${existing.toISOString().slice(11)}`);
  return Number.isNaN(moved.getTime()) ? existing : moved;
}

// A rental that has been dropped off and not yet picked up is still at the
// customer's. Cancelling it would mark the unit available while it's sitting
// on their driveway.
export function stillOutAtCustomer(items: { deliveredAt: Date | null; actualReturnDate: Date | null }[]): boolean {
  return items.some((item) => item.deliveredAt !== null && item.actualReturnDate === null);
}
