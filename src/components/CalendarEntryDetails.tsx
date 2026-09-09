"use client";

import Link from "next/link";
import { ConfirmButton } from "@/components/ConfirmButton";
import { cancelBooking } from "@/app/(internal)/bookings/actions";

export type CalendarPopoverEntry = {
  bookingId: string;
  bookingItemId: string;
  customerName: string;
  customerPhone: string | null;
  equipmentLabel: string;
  kind: "delivery" | "return";
  address: string;
  driverId: string | null;
  driverName: string | null;
  notes: string | null;
  date: string;
};

function formatTime(iso: string) {
  const date = new Date(iso);
  const hasTime = date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0;
  if (!hasTime) return null;
  return date.toLocaleTimeString(undefined, { timeZone: "UTC", hour: "numeric", minute: "2-digit" });
}

// The quick-view popover's content — shared between CalendarEntryPill (day/
// month views) and CalendarWeekGrid (week view, which has its own trigger/
// open-state wiring since a card there is also a drag handle).
export function CalendarEntryDetails({
  entry,
  driverDotClass,
  onClose,
}: {
  entry: CalendarPopoverEntry;
  driverDotClass?: string;
  onClose: () => void;
}) {
  const time = formatTime(entry.date);

  return (
    <div className="w-64 rounded-lg border-2 border-zinc-900 bg-white p-3 text-sm shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-ink">
          {entry.kind === "delivery" ? "Delivery" : "Return"}
          {time ? ` · ${time}` : ""}
        </span>
        <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700" aria-label="Close">
          ✕
        </button>
      </div>
      <p className="mt-1 font-semibold text-zinc-900">{entry.customerName}</p>
      {entry.customerPhone && <p className="text-zinc-500">{entry.customerPhone}</p>}
      <p className="mt-1 text-zinc-600">{entry.address}</p>
      <p className="mt-1 text-zinc-600">{entry.equipmentLabel}</p>
      {entry.driverName && (
        <p className="mt-1 flex items-center gap-1.5 text-zinc-600">
          <span className={`h-2 w-2 rounded-full ${driverDotClass ?? "bg-zinc-400"}`} />
          {entry.driverName}
        </p>
      )}
      {entry.notes && <p className="mt-1 text-xs text-zinc-400">Note: {entry.notes}</p>}
      <div className="mt-3 flex items-center justify-between gap-2">
        <Link href={`/bookings/${entry.bookingId}`} className="text-xs font-semibold text-brand hover:underline">
          View Full Booking →
        </Link>
        <form action={cancelBooking.bind(null, entry.bookingId)}>
          <ConfirmButton
            message={`Cancel ${entry.customerName}'s booking? This frees the equipment and removes it from Google Calendar.`}
            className="text-xs font-semibold text-red-600 hover:underline"
          >
            Cancel
          </ConfirmButton>
        </form>
      </div>
    </div>
  );
}
