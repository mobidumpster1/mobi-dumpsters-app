"use client";

import { useEffect, useState } from "react";

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthStartOf(dateStr: string) {
  return `${dateStr.slice(0, 7)}-01`;
}

// A month-grid date picker for the public booking page that grays out and
// disables dates the customer can't actually start a rental on, instead of
// letting them pick a date that fails the availability check afterward.
// When `rangeEnd` is given (the computed pickup date for the chosen rental
// length), the days between `value` and `rangeEnd` are shaded to show the
// whole rental span at a glance, not just the drop-off day.
export function AvailabilityCalendar({
  value,
  rangeEnd,
  onChange,
  minDate,
  fetchUnavailable,
}: {
  value: string;
  rangeEnd?: string;
  onChange: (date: string) => void;
  minDate: string;
  fetchUnavailable: (monthStart: string) => Promise<string[]>;
}) {
  const [visibleMonth, setVisibleMonth] = useState(monthStartOf(value || minDate));
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchUnavailable(visibleMonth).then((dates) => {
      if (!cancelled) {
        setUnavailable(new Set(dates));
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visibleMonth, fetchUnavailable]);

  const monthDate = new Date(`${visibleMonth}T00:00:00.000Z`);
  const year = monthDate.getUTCFullYear();
  const month = monthDate.getUTCMonth();
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells: (string | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      toDateStr(new Date(Date.UTC(year, month, i + 1)))
    ),
  ];

  function shiftMonth(delta: number) {
    const next = new Date(`${visibleMonth}T00:00:00.000Z`);
    next.setUTCMonth(next.getUTCMonth() + delta);
    setVisibleMonth(toDateStr(next));
  }

  return (
    <div className="rounded-xl border border-zinc-300 p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-lg px-2 py-1 text-sm font-medium text-zinc-500 hover:bg-zinc-100"
          aria-label="Previous month"
        >
          ‹
        </button>
        <p className="text-sm font-semibold text-ink">
          {monthDate.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded-lg px-2 py-1 text-sm font-medium text-zinc-500 hover:bg-zinc-100"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs text-zinc-400">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={i} />;
          const isPast = dateStr < minDate;
          const isUnavailable = unavailable.has(dateStr);
          const isStart = dateStr === value;
          const isEnd = !!rangeEnd && dateStr === rangeEnd;
          const isInRange =
            !!rangeEnd && dateStr > value && dateStr < rangeEnd;
          const disabled = isPast || isUnavailable;
          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => onChange(dateStr)}
              className={`aspect-square rounded-lg text-sm transition-colors ${
                isStart || isEnd
                  ? "bg-brand font-semibold text-white"
                  : isInRange
                    ? "bg-green-200 text-ink"
                    : disabled
                      ? "cursor-not-allowed bg-zinc-100 text-zinc-300"
                      : "text-zinc-700 hover:bg-brand-light"
              }`}
            >
              {Number(dateStr.slice(-2))}
            </button>
          );
        })}
      </div>

      {loading && (
        <p className="mt-2 text-center text-xs text-zinc-400">Checking availability…</p>
      )}
      <p className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-400">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-zinc-100" /> Unavailable
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-brand" /> Delivery / Pickup
        </span>
        {rangeEnd && (
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-green-200" /> Rental period
          </span>
        )}
      </p>
    </div>
  );
}
