"use client";

import { useState } from "react";
import { acceptQuote, declineQuote } from "./actions";

type LineItem = {
  id: string;
  description: string;
  amount: number;
  quantity: number;
  optional: boolean;
};

// Calls the accept/decline actions directly (not via <form action>) so a
// failure shows an inline error instead of crashing to Next's generic
// error page — same pattern as SendQuoteButton and the SMS/Stripe fixes
// earlier. router.refresh() isn't needed: revalidatePath inside the
// actions already refreshes this route's data once "responded" flips.
export function QuoteAcceptDecline({
  publicToken,
  status,
  lineItems,
}: {
  publicToken: string;
  status: string;
  lineItems: LineItem[];
}) {
  const optionalLines = lineItems.filter((l) => l.optional);
  const requiredTotal = lineItems
    .filter((l) => !l.optional)
    .reduce((sum, l) => sum + l.amount * l.quantity, 0);

  // Optional add-ons default pre-checked (opt-out, not opt-in) — maximizes
  // upsell capture while the customer can still deselect before accepting.
  const [selected, setSelected] = useState<Set<string>>(
    new Set(optionalLines.map((l) => l.id))
  );
  const [submitting, setSubmitting] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responded, setResponded] = useState<"accepted" | "declined" | null>(
    status === "accepted" ? "accepted" : status === "declined" ? "declined" : null
  );

  const liveTotal =
    requiredTotal +
    optionalLines
      .filter((l) => selected.has(l.id))
      .reduce((sum, l) => sum + l.amount * l.quantity, 0);

  function toggleLine(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAccept() {
    setSubmitting("accept");
    setError(null);
    try {
      await acceptQuote(publicToken, Array.from(selected));
      setResponded("accepted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't accept this quote.");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleDecline() {
    setSubmitting("decline");
    setError(null);
    try {
      await declineQuote(publicToken);
      setResponded("declined");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't decline this quote.");
    } finally {
      setSubmitting(null);
    }
  }

  if (responded === "accepted") {
    return (
      <p className="rounded-xl bg-green-50 p-4 text-center text-sm font-medium text-green-700">
        Thanks! We&apos;ve got your request and will reach out to confirm the details.
      </p>
    );
  }
  if (responded === "declined") {
    return (
      <p className="rounded-xl bg-zinc-50 p-4 text-center text-sm font-medium text-zinc-600">
        Got it — this quote has been declined. Reach out any time if you change your mind.
      </p>
    );
  }
  if (status === "expired") {
    return (
      <p className="rounded-xl bg-zinc-50 p-4 text-center text-sm font-medium text-zinc-600">
        This quote has expired — contact us for an updated price.
      </p>
    );
  }
  if (status === "draft") {
    return (
      <p className="rounded-xl bg-zinc-50 p-4 text-center text-sm font-medium text-zinc-600">
        This quote isn&apos;t ready to view yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {optionalLines.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-ink">Optional Add-ons</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Included by default — uncheck anything you don&apos;t want.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {optionalLines.map((line) => (
              <label
                key={line.id}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-zinc-50 p-3 text-sm"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.has(line.id)}
                    onChange={() => toggleLine(line.id)}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  <span className="font-medium text-ink">{line.description}</span>
                </span>
                <span className="font-semibold text-ink">${line.amount.toFixed(2)}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3">
            <p className="text-sm font-medium text-zinc-500">Your Total</p>
            <p className="text-base font-bold text-brand">${liveTotal.toFixed(2)}</p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleAccept}
          disabled={submitting !== null}
          className="flex-1 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {submitting === "accept" ? "Accepting…" : "Accept Quote"}
        </button>
        <button
          type="button"
          onClick={handleDecline}
          disabled={submitting !== null}
          className="flex-1 rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
        >
          {submitting === "decline" ? "Declining…" : "Decline"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
