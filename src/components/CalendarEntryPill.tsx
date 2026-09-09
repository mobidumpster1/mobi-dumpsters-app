"use client";

import { useState } from "react";
import { getDriverColor } from "@/lib/driverColors";
import { CalendarEntryDetails, type CalendarPopoverEntry } from "@/components/CalendarEntryDetails";

// A single delivery/return entry, used on the day and month calendar views
// (week view has its own version in CalendarWeekGrid, since a card there is
// also a drag handle) — click opens a small quick-view popover instead of
// always leaving the calendar to open the full booking page. Colored by
// driver (see driverColors.ts) when one is assigned, falling back to the
// existing delivery/return green/amber distinction when not.
export function CalendarEntryPill({ entry }: { entry: CalendarPopoverEntry }) {
  const [open, setOpen] = useState(false);
  const driverColor = entry.driverId ? getDriverColor(entry.driverId) : null;
  const bgClass = driverColor?.bg || (entry.kind === "delivery" ? "bg-green-100" : "bg-amber-100");
  const textClass = driverColor?.text || (entry.kind === "delivery" ? "text-green-800" : "text-amber-800");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-1 rounded-lg px-1.5 py-1 text-left text-xs font-medium transition-opacity hover:opacity-80 ${bgClass} ${textClass}`}
        title={`${entry.kind === "delivery" ? "Delivery" : "Return"}: ${entry.customerName} — ${entry.equipmentLabel}`}
      >
        <span className="min-w-0 flex-1 truncate">
          {entry.kind === "delivery" ? "🚚" : "↩️"} {entry.customerName}
        </span>
        {entry.driverId && <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${driverColor?.dot}`} />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1">
            <CalendarEntryDetails entry={entry} driverDotClass={driverColor?.dot} onClose={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
