"use client";

import { useState } from "react";
import { syncReviewsNow } from "@/app/(internal)/reviews/actions";

export function ReviewSyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  async function handleClick() {
    setSyncing(true);
    setError(null);
    try {
      const result = await syncReviewsNow();
      setLastResult(`Synced ${result.synced} review${result.synced === 1 ? "" : "s"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sync reviews.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={syncing}
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
      >
        {syncing ? "Syncing…" : "Sync Now"}
      </button>
      {lastResult && <p className="mt-1 text-xs text-zinc-500">{lastResult}</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
