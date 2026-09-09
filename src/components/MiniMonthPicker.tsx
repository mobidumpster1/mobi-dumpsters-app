import Link from "next/link";

const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];
const MS_PER_DAY = 86_400_000;

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

// A small always-visible month grid (Google Calendar sidebar-style) for
// jumping straight to any date, independent of the main day/week/month
// paging above it — always shows monthAnchor's month, regardless of which
// view is currently active, and preserves that view when a date is
// clicked (only the `date` param changes).
export function MiniMonthPicker({
  monthAnchor,
  selectedDateKey,
  todayKey,
  view,
}: {
  monthAnchor: Date;
  selectedDateKey: string;
  todayKey: string;
  view: string;
}) {
  const monthStart = new Date(Date.UTC(monthAnchor.getUTCFullYear(), monthAnchor.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(monthAnchor.getUTCFullYear(), monthAnchor.getUTCMonth() + 1, 0));
  const gridStart = new Date(monthStart.getTime() - monthStart.getUTCDay() * MS_PER_DAY);
  const gridEnd = new Date(monthEnd.getTime() + (6 - monthEnd.getUTCDay()) * MS_PER_DAY);
  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = new Date(d.getTime() + MS_PER_DAY)) days.push(d);

  function hrefFor(d: Date) {
    const params = new URLSearchParams();
    if (view !== "month") params.set("view", view);
    params.set("date", dateKey(d));
    return `/calendar?${params.toString()}`;
  }

  function monthNavHref(direction: 1 | -1) {
    const target = new Date(Date.UTC(monthAnchor.getUTCFullYear(), monthAnchor.getUTCMonth() + direction, 1));
    return hrefFor(target);
  }

  return (
    <div className="rounded-lg border-2 border-zinc-900 bg-white p-3">
      <div className="flex items-center justify-between">
        <Link
          href={monthNavHref(-1)}
          className="rounded px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-100"
          aria-label="Previous month"
        >
          ‹
        </Link>
        <span className="text-xs font-bold text-ink">
          {monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" })}
        </span>
        <Link
          href={monthNavHref(1)}
          className="rounded px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-100"
          aria-label="Next month"
        >
          ›
        </Link>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold text-zinc-400">
        {WEEKDAY_INITIALS.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {days.map((d) => {
          const key = dateKey(d);
          const inMonth = d.getUTCMonth() === monthStart.getUTCMonth();
          const isToday = key === todayKey;
          const isSelected = key === selectedDateKey;
          return (
            <Link
              key={key}
              href={hrefFor(d)}
              className={`flex h-7 items-center justify-center rounded-full text-[11px] transition-colors ${
                isSelected
                  ? "bg-brand font-bold text-white"
                  : isToday
                    ? "font-bold text-brand hover:bg-brand/10"
                    : inMonth
                      ? "text-zinc-700 hover:bg-zinc-100"
                      : "text-zinc-300 hover:bg-zinc-50"
              }`}
            >
              {d.getUTCDate()}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
