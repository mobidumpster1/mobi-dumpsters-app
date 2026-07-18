"use client";

import { useState } from "react";
import { clockIn, clockOut } from "@/app/(internal)/time/actions";

// Calls clockIn/clockOut directly (not via <form action>) so a failure
// (e.g. already clocked in) shows a friendly inline error instead of
// crashing to Next's generic error page — same pattern as SendQuoteButton.
export function ClockInOutButton({
  openEntryId,
  bookingId,
}: {
  openEntryId: string | null;
  bookingId?: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSubmitting(true);
    setError(null);
    try {
      if (openEntryId) {
        await clockOut(openEntryId);
      } else {
        await clockIn(bookingId ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update your clock status.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting}
        className={`rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors disabled:opacity-60 ${
          openEntryId ? "bg-red-600 hover:bg-red-700" : "bg-brand hover:bg-brand-dark"
        }`}
      >
        {submitting ? "Working…" : openEntryId ? "Clock Out" : "Clock In"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
