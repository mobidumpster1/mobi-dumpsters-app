import Link from "next/link";
import { db } from "@/lib/db";

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
  customerName: string;
  equipmentLabel: string;
  kind: "delivery" | "return";
};

function AgendaDay({
  day,
  entries,
  isToday,
}: {
  day: Date;
  entries: CalendarEntry[];
  isToday: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
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
      <div className="mt-3 flex flex-col gap-2">
        {entries.map((entry, i) => (
          <Link
            key={`${entry.bookingId}-${entry.kind}-${i}`}
            href={`/bookings/${entry.bookingId}`}
            className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
              entry.kind === "delivery"
                ? "bg-green-100 text-green-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            <span className="truncate">
              {entry.kind === "delivery" ? "🚚" : "↩️"} {entry.customerName} — {entry.equipmentLabel}
            </span>
          </Link>
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
  let monthStart = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  let monthEnd = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));

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
      booking: { status: { notIn: ["cancelled", "pending"] } },
      OR: [
        { startDate: { gte: rangeStart, lte: rangeEnd } },
        { expectedReturnDate: { gte: rangeStart, lte: rangeEnd } },
      ],
    },
    include: { equipmentItem: true, booking: { include: { customer: true } } },
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
        customerName: item.booking.customer.name,
        equipmentLabel: item.equipmentItem.label,
        kind: "delivery",
      });
    }
    if (item.expectedReturnDate >= rangeStart && item.expectedReturnDate <= rangeEnd) {
      addEntry(item.expectedReturnDate, {
        bookingId: item.bookingId,
        customerName: item.booking.customer.name,
        equipmentLabel: item.equipmentItem.label,
        kind: "return",
      });
    }
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
          <h1 className="text-3xl font-bold tracking-tight text-ink">Calendar</h1>
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

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-ink">{title}</h2>
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
        <div className="mt-4">
          <AgendaDay
            day={anchor}
            entries={entriesByDay.get(dateKey(anchor)) ?? []}
            isToday={dateKey(anchor) === todayKey}
          />
        </div>
      )}

      {view === "week" && (
        <div className="mt-4 flex flex-col gap-3">
          {gridDays.map((day) => (
            <AgendaDay
              key={dateKey(day)}
              day={day}
              entries={entriesByDay.get(dateKey(day)) ?? []}
              isToday={dateKey(day) === todayKey}
            />
          ))}
        </div>
      )}

      {view === "month" && (
        <>
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
          <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-zinc-200 shadow-sm md:block">
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
                    className={`flex min-h-32 flex-col gap-1 bg-white p-2 ${
                      inMonth ? "" : "bg-zinc-50"
                    }`}
                  >
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
                    <div className="flex flex-col gap-1">
                      {entries.map((entry, i) => (
                        <Link
                          key={`${entry.bookingId}-${entry.kind}-${i}`}
                          href={`/bookings/${entry.bookingId}`}
                          className={`truncate rounded-lg px-1.5 py-1 text-xs font-medium hover:opacity-80 ${
                            entry.kind === "delivery"
                              ? "bg-green-100 text-green-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                          title={`${entry.kind === "delivery" ? "Delivery" : "Return"}: ${entry.customerName} — ${entry.equipmentLabel}`}
                        >
                          {entry.kind === "delivery" ? "🚚" : "↩️"} {entry.customerName}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="mt-4 flex gap-4 text-sm text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-green-100" /> Delivery
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-amber-100" /> Return
        </span>
      </div>
    </div>
  );
}
