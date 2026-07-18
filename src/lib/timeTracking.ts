type TimeEntryLike = {
  clockIn: Date;
  clockOut: Date | null;
  hourlyRate: number | null;
};

// Open (still-clocked-in) entries contribute zero hours/cost until closed
// out — a labor-cost report shouldn't guess at an in-progress shift's
// eventual length.
export function computeLaborCost(entries: TimeEntryLike[]): { hours: number; cost: number } {
  return entries.reduce(
    (totals, entry) => {
      if (!entry.clockOut) return totals;
      const hours = (entry.clockOut.getTime() - entry.clockIn.getTime()) / 3_600_000;
      const cost = hours * (entry.hourlyRate ?? 0);
      return { hours: totals.hours + hours, cost: totals.cost + cost };
    },
    { hours: 0, cost: 0 }
  );
}

export function entryHours(entry: TimeEntryLike): number | null {
  if (!entry.clockOut) return null;
  return (entry.clockOut.getTime() - entry.clockIn.getTime()) / 3_600_000;
}
