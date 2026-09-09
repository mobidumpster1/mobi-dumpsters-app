"use client";

import { useState } from "react";

export function DepositReleaseButton({
  bookingId,
  remaining,
  action,
}: {
  bookingId: string;
  remaining: number;
  action: (bookingId: string, formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [note, setNote] = useState("");
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return <p className="mt-2 text-sm font-medium text-green-700">Deposit released.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
      >
        Release Deposit…
      </button>
    );
  }

  async function handleClick() {
    setReleasing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("amountDollars", amount);
      formData.set("note", note);
      await action(bookingId, formData);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't release that deposit.");
    } finally {
      setReleasing(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <label className="text-xs font-medium text-zinc-700">
        Amount to return (up to ${remaining.toFixed(2)})
      </label>
      <input
        type="number"
        min="0"
        max={remaining}
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-28 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
      />
      <input
        type="text"
        placeholder="Note (optional — e.g. reason for keeping part of it)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleClick}
          disabled={releasing}
          className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {releasing ? "Releasing…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm font-semibold text-zinc-500 hover:underline"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
