// Reports date-range filtering. `end` is always the exclusive upper bound
// internally (so a same-day range still matches), even though the UI and
// URL params speak in inclusive "from/to" calendar dates.
export type DateRange = { start: Date; end: Date };

function toUTCDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateRangeParams(params: { from?: string; to?: string }): DateRange | null {
  if (!params.from || !params.to) return null;
  const start = toUTCDateOnly(params.from);
  const endInclusive = toUTCDateOnly(params.to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(endInclusive.getTime())) return null;
  const end = new Date(endInclusive.getTime() + 86_400_000);
  if (end <= start) return null;
  return { start, end };
}

// The immediately preceding period of the same length — the baseline a
// custom range is compared against (e.g. picking March compares to
// February, picking a 10-day span compares to the 10 days before it).
export function priorPeriod(range: DateRange): DateRange {
  const lengthMs = range.end.getTime() - range.start.getTime();
  return { start: new Date(range.start.getTime() - lengthMs), end: range.start };
}

export function inRange(date: Date, range: DateRange | null): boolean {
  if (!range) return true;
  return date >= range.start && date < range.end;
}

export function reportPresets(now: Date): { label: string; from: string; to: string }[] {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const today = new Date(Date.UTC(y, m, now.getUTCDate()));
  const startOfMonth = new Date(Date.UTC(y, m, 1));
  const startOfLastMonth = new Date(Date.UTC(y, m - 1, 1));
  const endOfLastMonth = new Date(Date.UTC(y, m, 0));
  const startOfQuarter = new Date(Date.UTC(y, Math.floor(m / 3) * 3, 1));
  const startOfYear = new Date(Date.UTC(y, 0, 1));
  const startOfLastYear = new Date(Date.UTC(y - 1, 0, 1));
  const endOfLastYear = new Date(Date.UTC(y - 1, 11, 31));

  return [
    { label: "This Month", from: formatDateInput(startOfMonth), to: formatDateInput(today) },
    { label: "Last Month", from: formatDateInput(startOfLastMonth), to: formatDateInput(endOfLastMonth) },
    { label: "This Quarter", from: formatDateInput(startOfQuarter), to: formatDateInput(today) },
    { label: "This Year", from: formatDateInput(startOfYear), to: formatDateInput(today) },
    { label: "Last Year", from: formatDateInput(startOfLastYear), to: formatDateInput(endOfLastYear) },
  ];
}
