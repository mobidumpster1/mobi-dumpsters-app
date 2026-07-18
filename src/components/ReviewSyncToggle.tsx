"use client";

import { useState } from "react";
import { toggleReviewSync } from "@/app/(internal)/reviews/actions";

// Pauses/resumes the daily auto-sync without disconnecting — Sync Now
// stays available regardless. Calls the action directly so a failure
// shows an inline error instead of crashing to Next's generic error page.
export function ReviewSyncToggle({ syncEnabled }: { syncEnabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      await toggleReviewSync(!syncEnabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update auto-sync.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`rounded-full px-3 py-1.5 text-xs font-black disabled:opacity-60 ${
          syncEnabled ? "bg-green-600 text-white" : "border-2 border-zinc-300 text-zinc-600"
        }`}
      >
        {syncEnabled ? "Auto-Sync: On" : "Auto-Sync: Off"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
