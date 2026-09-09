// The dump this business hauls to is only open 7am-5pm, Monday-Saturday
// (closed Sunday). A unit that's just been picked up can't go back out on a
// new delivery until it's actually been emptied there, so availability and
// reschedule checks treat a unit as busy through the next dump-open moment
// at or after its pickup — not just through the raw pickup timestamp.
//
// If the pickup itself lands inside an open window, we assume the driver
// can run it to the dump that same day, so the unit frees up right away.
// Hours are literal UTC digits, matching the rest of the app's date
// convention (see src/lib/date.ts) — there's no real per-org timezone data
// to convert against.
const DUMP_OPEN_HOUR = 7;
const DUMP_CLOSE_HOUR = 17;

export function nextDumpAvailableTime(pickupDate: Date): Date {
  const year = pickupDate.getUTCFullYear();
  const month = pickupDate.getUTCMonth();
  const day = pickupDate.getUTCDate();
  const hour = pickupDate.getUTCHours();
  const weekday = pickupDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const isOpenDay = weekday !== 0;

  if (isOpenDay && hour >= DUMP_OPEN_HOUR && hour < DUMP_CLOSE_HOUR) {
    return pickupDate;
  }

  let next = isOpenDay && hour < DUMP_OPEN_HOUR
    ? new Date(Date.UTC(year, month, day, DUMP_OPEN_HOUR, 0, 0, 0))
    : new Date(Date.UTC(year, month, day + 1, DUMP_OPEN_HOUR, 0, 0, 0));

  while (next.getUTCDay() === 0) {
    next = new Date(next.getTime() + 24 * 60 * 60 * 1000);
  }
  return next;
}
