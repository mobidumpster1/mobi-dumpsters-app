"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Entry = {
  bookingId: string;
  bookingItemId: string;
  customerName: string;
  equipmentLabel: string;
  kind: "delivery" | "return";
};

type Day = {
  key: string; // "YYYY-MM-DD"
  weekdayLabel: string;
  dayNumber: number;
  isToday: boolean;
  entries: Entry[];
};

// Pointer Events (not the native HTML5 drag-and-drop API) on purpose —
// draggable="true"/dragstart/drop only fire for mouse input, not touch,
// which would make this unusable on the phones/iPads this app is mostly
// used from. Pointer Events fire uniformly for mouse, touch, and pen, at
// the cost of doing hit-testing by hand (bounding-rect checks against
// each day column's ref) instead of getting it for free from the browser.
export function CalendarWeekGrid({
  days,
  onDrop,
}: {
  days: Day[];
  onDrop: (bookingItemId: string, kind: "delivery" | "return", newDateKey: string) => Promise<void>;
}) {
  const router = useRouter();
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [dragging, setDragging] = useState<{ entry: Entry; fromKey: string; x: number; y: number } | null>(
    null
  );
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handlePointerDown(e: React.PointerEvent, entry: Entry, fromKey: string) {
    // Only the left mouse button / a real touch/pen contact starts a drag —
    // avoids hijacking right-click or accidental multi-touch.
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    setError(null);
    setDragging({ entry, fromKey, x: e.clientX, y: e.clientY });

    function move(ev: PointerEvent) {
      setDragging((d) => (d ? { ...d, x: ev.clientX, y: ev.clientY } : d));
      let landed: string | null = null;
      for (const [key, el] of Object.entries(columnRefs.current)) {
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
          landed = key;
          break;
        }
      }
      setHoverKey(landed);
    }

    async function up(ev: PointerEvent) {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      let dropKey: string | null = null;
      for (const [key, el] of Object.entries(columnRefs.current)) {
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
          dropKey = key;
          break;
        }
      }
      setDragging(null);
      setHoverKey(null);
      if (!dropKey || dropKey === fromKey) return;

      setPending(true);
      try {
        await onDrop(entry.bookingItemId, entry.kind, dropKey);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't reschedule that.");
      } finally {
        setPending(false);
      }
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  }

  return (
    <div>
      <p className="mb-2 text-xs text-zinc-400">
        Press and drag a card to a different day to reschedule it.
      </p>
      {error && (
        <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((day) => (
          <div
            key={day.key}
            ref={(el) => {
              columnRefs.current[day.key] = el;
            }}
            className={`flex min-h-[140px] flex-col gap-2 rounded-lg border-2 p-3 transition-colors ${
              hoverKey === day.key
                ? "border-brand bg-brand/5"
                : day.isToday
                  ? "border-brand bg-white"
                  : "border-zinc-900 bg-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  day.isToday ? "bg-brand text-white" : "bg-zinc-100 text-zinc-700"
                }`}
              >
                {day.dayNumber}
              </span>
              <span className="text-xs font-semibold text-zinc-500">{day.weekdayLabel}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {day.entries.map((entry, i) => {
                const isBeingDragged =
                  dragging?.entry.bookingItemId === entry.bookingItemId &&
                  dragging.entry.kind === entry.kind;
                return (
                  <div
                    key={`${entry.bookingItemId}-${entry.kind}-${i}`}
                    onPointerDown={(e) => handlePointerDown(e, entry, day.key)}
                    className={`touch-none select-none rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-grab active:cursor-grabbing ${
                      entry.kind === "delivery"
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    } ${isBeingDragged ? "opacity-30" : ""}`}
                  >
                    {entry.kind === "delivery" ? "🚚" : "↩️"} {entry.customerName} — {entry.equipmentLabel}
                  </div>
                );
              })}
              {day.entries.length === 0 && (
                <p className="text-xs text-zinc-300">—</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {dragging && (
        <div
          className={`pointer-events-none fixed z-50 rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-lg ${
            dragging.entry.kind === "delivery" ? "bg-green-200 text-green-900" : "bg-amber-200 text-amber-900"
          }`}
          style={{ left: dragging.x + 12, top: dragging.y + 12 }}
        >
          {dragging.entry.kind === "delivery" ? "🚚" : "↩️"} {dragging.entry.customerName}
        </div>
      )}
      {pending && <p className="mt-2 text-xs text-zinc-400">Saving…</p>}

      <p className="mt-3 text-xs text-zinc-400">
        Need to cancel a booking instead? Open it from{" "}
        <Link href="/bookings" className="text-brand hover:underline">
          Bookings
        </Link>
        .
      </p>
    </div>
  );
}
