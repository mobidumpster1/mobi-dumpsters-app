// The dump this business hauls to has configurable open hours/days (see
// DumpScheduleSettings, edited from Settings — defaults to 7am-5pm,
// Monday-Saturday). A unit that's just been picked up can't go back out on
// a new delivery until it's actually been emptied there, so availability
// and reschedule checks treat a unit as busy through the next dump-open
// moment at or after its pickup — not just through the raw pickup
// timestamp.
//
// If the pickup itself lands inside an open window, we assume the driver
// can run it to the dump that same day, so the unit frees up right away.
// Hours are literal UTC digits, matching the rest of the app's date
// convention (see src/lib/date.ts) — there's no real per-org timezone data
// to convert against.
export type DumpScheduleSettings = {
  openHour: number;
  closeHour: number;
  openSunday: boolean;
  openMonday: boolean;
  openTuesday: boolean;
  openWednesday: boolean;
  openThursday: boolean;
  openFriday: boolean;
  openSaturday: boolean;
};

const OPEN_DAY_KEYS = [
  "openSunday",
  "openMonday",
  "openTuesday",
  "openWednesday",
  "openThursday",
  "openFriday",
  "openSaturday",
] as const satisfies readonly (keyof DumpScheduleSettings)[];

function isOpenDay(settings: DumpScheduleSettings, weekday: number): boolean {
  return settings[OPEN_DAY_KEYS[weekday]];
}

export function nextDumpAvailableTime(pickupDate: Date, settings: DumpScheduleSettings): Date {
  const { openHour, closeHour } = settings;
  const year = pickupDate.getUTCFullYear();
  const month = pickupDate.getUTCMonth();
  const day = pickupDate.getUTCDate();
  const hour = pickupDate.getUTCHours();
  const weekday = pickupDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const pickupDayIsOpen = isOpenDay(settings, weekday);

  if (pickupDayIsOpen && hour >= openHour && hour < closeHour) {
    return pickupDate;
  }

  let next = pickupDayIsOpen && hour < openHour
    ? new Date(Date.UTC(year, month, day, openHour, 0, 0, 0))
    : new Date(Date.UTC(year, month, day + 1, openHour, 0, 0, 0));

  // Roll forward to the next open day. Capped at 7 tries so a
  // misconfigured schedule (every day marked closed) can't loop forever.
  for (let i = 0; i < 7 && !isOpenDay(settings, next.getUTCDay()); i++) {
    next = new Date(next.getTime() + 24 * 60 * 60 * 1000);
  }
  return next;
}

// Large-scale jobs (junk removal, demolition) can dump at the company's
// own yard instead of the public dump when necessary — that's not hour-
// restricted, so a category flagged dumpsAtOwnYard skips the buffer
// entirely and the unit is treated as free the instant it's picked up.
export function unitFreeAfter(
  pickupDate: Date,
  dumpsAtOwnYard: boolean,
  settings: DumpScheduleSettings
): Date {
  return dumpsAtOwnYard ? pickupDate : nextDumpAvailableTime(pickupDate, settings);
}
