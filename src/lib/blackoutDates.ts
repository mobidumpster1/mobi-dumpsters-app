import { db } from "@/lib/db";

type BlackoutRangeLike = { startDate: Date; endDate: Date };

// Whichever day a delivery would start on — pickup-day blackout isn't a
// concept the business asked for, so a blackout only ever blocks the
// delivery side of a booking, same as the minimum-notice check below.
export function isDateBlackedOut(date: Date, ranges: BlackoutRangeLike[]): boolean {
  return ranges.some((range) => date >= range.startDate && date < range.endDate);
}

export function meetsMinimumNotice(startDate: Date, minimumNoticeHours: number): boolean {
  if (minimumNoticeHours <= 0) return true;
  return startDate.getTime() - Date.now() >= minimumNoticeHours * 3_600_000;
}

export async function listBlackoutDates(organizationId: string) {
  return db.blackoutDate.findMany({
    where: { organizationId },
    orderBy: { startDate: "asc" },
  });
}
