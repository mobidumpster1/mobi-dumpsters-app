import Link from "next/link";
import { db } from "@/lib/db";
import { LocationMap } from "@/components/LocationMap";
import { CalendarEntryPill } from "@/components/CalendarEntryPill";
import { rescheduleBookingItem } from "./actions";
import { CalendarWeekGrid } from "@/components/CalendarWeekGrid";
import { MiniMonthPicker } from "@/components/MiniMonthPicker";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const MS_PER_DAY = 86_400_000;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type ViewMode = "day" | "week" | "month";

function startOfDayUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function startOfWeekUTC(date: Date) {
  return addDays(startOfDayUTC(date), -date.getUTCDay());
}

function parseDateParam(value: string | undefined, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

type CalendarEntry = {
  bookingId: string;
  bookingItemId: string;
  customerName: string;
  customerPhone: string | null;
  equipmentLabel: string;
  kind: "delivery" | "return";
  lat: number | null;
  lng: number | null;
  address: string;
  driverId: string | null;
  driverName: string | null;
  notes: string | null;
  date: string; // ISO — the date this entry actually falls on (startDate or expectedReturnDate)
};

function AgendaDay({
  day,
  entries,
  isToday,
  newBookingHref,
}: {
  day: Date;
  entries: CalendarEntry[];
  isToday: boolean;
  newBookingHref?: string;
}) {
  return (
    <div className="rounded-lg border-2 border-zinc-900 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              isToday ? "bg-brand text-white" : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {day.getUTCDate()}
          </span>
          <span className="text-sm font-semibold text-zinc-700">
            {day.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              timeZone: "UTC",
            })}
          </span>
        </div>
        {newBookingHref && (
          <Link
            href={newBookingHref}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            + New Booking
          </Link>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {entries.map((entry, i) => (
          <CalendarEntryPill key={`${entry.bookingId}-${entry.kind}-${i}`} entry={entry} />
        ))}
        {entries.length === 0 && (
          <p className="text-sm text-zinc-400">Nothing scheduled.</p>
        )}
      </div>
    </div>
  );
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const user = await requireUser();
  const { view: viewParam, date: dateParam } = await searchParams;
  const view: ViewMode =
    viewParam === "day" || viewParam === "week" ? viewParam : "month";

  const now = new Date();
  const anchor = parseDateParam(dateParam, startOfDayUTC(now));
  const todayKey = dateKey(startOfDayUTC(now));

  // Range of dates whose entries we need to fetch, and (for month view) the
  // padded grid range used to render a full 7-column calendar.
  let rangeStart: Date;
  let rangeEnd: Date;
  const monthStart = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));

  if (view === "day") {
    rangeStart = anchor;
    rangeEnd = anchor;
  } else if (view === "week") {
    rangeStart = startOfWeekUTC(anchor);
    rangeEnd = addDays(rangeStart, 6);
  } else {
    rangeStart = addDays(monthStart, -monthStart.getUTCDay());
    rangeEnd = addDays(monthEnd, 6 - monthEnd.getUTCDay());
  }

  const items = await db.bookingItem.findMany({
    where: {
      booking: {
        status: { notIn: ["cancelled", "pending"] },
        organizationId: user.effectiveOrganizationId,
      },
      OR: [
        { startDate: { gte: rangeStart, lte: rangeEnd } },
        { expectedReturnDate: { gte: rangeStart, lte: rangeEnd } },
      ],
    },
    include: { equipmentItem: true, booking: { include: { customer: true, driver: true } } },
  });

  const entriesByDay = new Map<string, CalendarEntry[]>();
  function addEntry(date: Date, entry: CalendarEntry) {
    const key = dateKey(startOfDayUTC(date));
    const list = entriesByDay.get(key) ?? [];
    list.push(entry);
    entriesByDay.set(key, list);
  }
  for (const item of items) {
    if (item.startDate >= rangeStart && item.startDate <= rangeEnd) {
      addEntry(item.startDate, {
        bookingId: item.bookingId,
        bookingItemId: item.id,
        customerName: item.booking.customer.name,
        customerPhone: item.booking.customer.phone,
        equipmentLabel: item.equipmentItem.label,
        kind: "delivery",
        lat: item.booking.latitude,
        lng: item.booking.longitude,
        address: item.booking.deliveryAddress,
        driverId: item.booking.driverId,
        driverName: item.booking.driver?.name ?? null,
        notes: item.booking.notes,
        date: item.startDate.toISOString(),
      });
    }
    if (item.expectedReturnDate >= rangeStart && item.expectedReturnDate <= rangeEnd) {
      addEntry(item.expectedReturnDate, {
        bookingId: item.bookingId,
        bookingItemId: item.id,
        customerName: item.booking.customer.name,
        customerPhone: item.booking.customer.phone,
        equipmentLabel: item.equipmentItem.label,
        kind: "return",
        lat: item.booking.latitude,
        lng: item.booking.longitude,
        address: item.booking.deliveryAddress,
        driverId: item.booking.driverId,
        driverName: item.booking.driver?.name ?? null,
        notes: item.booking.notes,
        date: item.expectedReturnDate.toISOString(),
      });
    }
  }

  // One pin per booking (a booking can have a delivery and a return entry
  // in the same range, or multiple items), for whichever days are in view.
  function pinsForDays(days: Date[]) {
    const seen = new Map<string, { id: string; lat: number; lng: number; label: string; href: string }>();
    for (const day of days) {
      for (const entry of entriesByDay.get(dateKey(day)) ?? []) {
        if (entry.lat == null || entry.lng == null || seen.has(entry.bookingId)) continue;
        seen.set(entry.bookingId, {
          id: entry.bookingId,
          lat: entry.lat,
          lng: entry.lng,
          label: `${entry.customerName} — ${entry.address}`,
          href: `/bookings/${entry.bookingId}`,
        });
      }
    }
    return Array.from(seen.values());
  }

  const gridDays: Date[] = [];
  for (let d = rangeStart; d <= rangeEnd; d = addDays(d, 1)) {
    gridDays.push(d);
  }

  let title: string;
  if (view === "day") {
    title = anchor.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } else if (view === "week") {
    const weekEnd = addDays(rangeStart, 6);
    const startLabel = rangeStart.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    const endLabel = weekEnd.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
    title = `${startLabel} – ${endLabel}`;
  } else {
    title = monthStart.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  function shiftedDate(direction: 1 | -1) {
    if (view === "day") return addDays(anchor, direction);
    if (view === "week") return addDays(anchor, direction * 7);
    return new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + direction, 1));
  }

  function navLink(target: Date | null, targetView: ViewMode = view) {
    const params = new URLSearchParams();
    if (targetView !== "month") params.set("view", targetView);
    if (target) params.set("date", dateKey(target));
    const qs = params.toString();
    return `/calendar${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">Calendar</h1>
          <p className="mt-1 text-zinc-500">
            Deliveries and returns from your bookings. Also pushed one-way to
            your Google Calendar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={navLink(shiftedDate(-1))}
            className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            ← Prev
          </Link>
          <Link
            href={navLink(null)}
            className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Today
          </Link>
          <Link
            href={navLink(shiftedDate(1))}
            className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Next →
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-col gap-4 lg:w-64 lg:flex-shrink-0">
          <MiniMonthPicker
            monthAnchor={anchor}
            selectedDateKey={dateKey(anchor)}
            todayKey={todayKey}
            view={view}
          />
          <div className="flex flex-col gap-1.5 text-sm text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-green-100" /> Delivery
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-amber-100" /> Return
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-zinc-400" /> Colored dot = assigned driver
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-ink">{title}</h2>
            <div className="flex gap-2">
              {(["day", "week", "month"] as ViewMode[]).map((mode) => (
                <Link
                  key={mode}
                  href={navLink(anchor, mode)}
                  className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    view === mode
                      ? "bg-brand text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {mode}
                </Link>
              ))}
            </div>
          </div>

      {view === "day" && (
        <div className="mt-4 flex flex-col gap-4">
          <LocationMap pins={pinsForDays([anchor])} heightClassName="h-72" />
          <AgendaDay
            day={anchor}
            entries={entriesByDay.get(dateKey(anchor)) ?? []}
            isToday={dateKey(anchor) === todayKey}
            newBookingHref={`/bookings/new?date=${dateKey(anchor)}`}
          />
        </div>
      )}

      {view === "week" && (
        <div className="mt-4 flex flex-col gap-4">
          <LocationMap pins={pinsForDays(gridDays)} heightClassName="h-80" />
          <CalendarWeekGrid
            days={gridDays.map((day) => ({
              key: dateKey(day),
              weekdayLabel: day.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" }),
              dayNumber: day.getUTCDate(),
              isToday: dateKey(day) === todayKey,
              entries: entriesByDay.get(dateKey(day)) ?? [],
            }))}
            onDrop={rescheduleBookingItem}
          />
        </div>
      )}

      {view === "month" && (
        <>
          <div className="mt-4">
            <LocationMap pins={pinsForDays(gridDays)} heightClassName="h-80" />
          </div>

          {/* Mobile: agenda list, only days with entries */}
          <div className="mt-4 flex flex-col gap-3 md:hidden">
            {gridDays
              .filter(
                (day) =>
                  day.getUTCMonth() === monthStart.getUTCMonth() &&
                  (entriesByDay.get(dateKey(day))?.length ?? 0) > 0
              )
              .map((day) => (
                <AgendaDay
                  key={dateKey(day)}
                  day={day}
                  entries={entriesByDay.get(dateKey(day)) ?? []}
                  isToday={dateKey(day) === todayKey}
                />
              ))}
            {gridDays.every(
              (day) =>
                day.getUTCMonth() !== monthStart.getUTCMonth() ||
                (entriesByDay.get(dateKey(day))?.length ?? 0) === 0
            ) && (
              <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
                No deliveries or returns scheduled this month.
              </p>
            )}
          </div>

          {/* Tablet/desktop: month grid */}
          <div className="mt-4 hidden overflow-x-auto rounded-lg border-2 border-zinc-900 md:block">
            <div className="grid min-w-[700px] grid-cols-7 gap-px bg-zinc-200">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="bg-zinc-50 px-3 py-2 text-center text-xs font-semibold text-zinc-500"
                >
                  {label}
                </div>
              ))}
              {gridDays.map((day) => {
                const key = dateKey(day);
                const entries = entriesByDay.get(key) ?? [];
                const inMonth = day.getUTCMonth() === monthStart.getUTCMonth();
                const isToday = key === todayKey;
                return (
                  <div
                    key={key}
                    className={`group relative flex min-h-32 flex-col gap-1 bg-white p-2 ${
                      inMonth ? "" : "bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          isToday
                            ? "bg-brand text-white"
                            : inMonth
                              ? "text-zinc-700"
                              : "text-zinc-300"
                        }`}
                      >
                        {day.getUTCDate()}
                      </span>
                      <Link
                        href={`/bookings/new?date=${key}`}
                        className="hidden h-5 w-5 items-center justify-center rounded-full text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-700 group-hover:opacity-100 sm:flex"
                        title={`New booking on ${key}`}
                      >
                        +
                      </Link>
                    </div>
                    <div className="flex flex-col gap-1">
                      {entries.map((entry, i) => (
                        <CalendarEntryPill key={`${entry.bookingId}-${entry.kind}-${i}`} entry={entry} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
        </div>
      </div>
    </div>
  );
}
