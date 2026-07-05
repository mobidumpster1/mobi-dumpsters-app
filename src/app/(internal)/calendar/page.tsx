import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const MS_PER_DAY = 86_400_000;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDayUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

type CalendarEntry = {
  bookingId: string;
  customerName: string;
  equipmentLabel: string;
  kind: "delivery" | "return";
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { year: yearParam, month: monthParam } = await searchParams;

  const now = new Date();
  const year = yearParam ? parseInt(yearParam, 10) : now.getUTCFullYear();
  // month query param is 1-indexed for readability in the URL.
  const month = monthParam ? parseInt(monthParam, 10) - 1 : now.getUTCMonth();

  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0));
  const gridStart = addDays(monthStart, -monthStart.getUTCDay());
  const gridEnd = addDays(monthEnd, 6 - monthEnd.getUTCDay());

  const items = await db.bookingItem.findMany({
    where: {
      booking: { status: { notIn: ["cancelled", "pending"] } },
      OR: [
        { startDate: { gte: gridStart, lte: gridEnd } },
        { expectedReturnDate: { gte: gridStart, lte: gridEnd } },
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
    if (item.startDate >= gridStart && item.startDate <= gridEnd) {
      addEntry(item.startDate, {
        bookingId: item.bookingId,
        customerName: item.booking.customer.name,
        equipmentLabel: item.equipmentItem.label,
        kind: "delivery",
      });
    }
    if (item.expectedReturnDate >= gridStart && item.expectedReturnDate <= gridEnd) {
      addEntry(item.expectedReturnDate, {
        bookingId: item.bookingId,
        customerName: item.booking.customer.name,
        equipmentLabel: item.equipmentItem.label,
        kind: "return",
      });
    }
  }

  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) {
    days.push(d);
  }

  const monthLabel = monthStart.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const todayKey = dateKey(startOfDayUTC(now));

  function monthLink(offset: number) {
    const target = new Date(Date.UTC(year, month + offset, 1));
    return `/calendar?year=${target.getUTCFullYear()}&month=${target.getUTCMonth() + 1}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Calendar</h1>
          <p className="mt-1 text-zinc-500">
            Deliveries and returns from your bookings. Also pushed one-way to
            your Google Calendar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={monthLink(-1)}
            className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            ← Prev
          </Link>
          <Link
            href="/calendar"
            className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Today
          </Link>
          <Link
            href={monthLink(1)}
            className="rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Next →
          </Link>
        </div>
      </div>

      <h2 className="mt-6 text-xl font-semibold text-ink">{monthLabel}</h2>

      <div className="mt-3 grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 shadow-sm">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="bg-zinc-50 px-3 py-2 text-center text-xs font-semibold text-zinc-500"
          >
            {label}
          </div>
        ))}
        {days.map((day) => {
          const key = dateKey(day);
          const entries = entriesByDay.get(key) ?? [];
          const inMonth = day.getUTCMonth() === month;
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
