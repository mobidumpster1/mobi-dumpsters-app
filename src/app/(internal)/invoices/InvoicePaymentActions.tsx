"use client";

import { useState } from "react";
import { chargeInvoiceViaStripe, sendInvoiceCheckoutLink, refundInvoicePayment } from "./actions";

// Calls the Stripe actions directly instead of via <form action> so a
// failed charge (declined card, bad API key, etc) shows a friendly inline
// error instead of crashing to Next's generic error page.
export function ChargeCardButton({
  invoiceId,
  amount,
}: {
  invoiceId: string;
  amount: number;
}) {
  const [charging, setCharging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setCharging(true);
    setError(null);
    try {
      await chargeInvoiceViaStripe(invoiceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't charge that card.");
    } finally {
      setCharging(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={charging}
        className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {charging ? "Charging…" : `Charge $${amount.toFixed(2)}`}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function SendCheckoutLinkButton({ invoiceId }: { invoiceId: string }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleClick() {
    setSending(true);
    setError(null);
    try {
      await sendInvoiceCheckoutLink(invoiceId);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that payment link.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={sending}
        className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {sending ? "Sending…" : "Send Payment Link"}
      </button>
      {sent && <p className="mt-2 text-sm font-medium text-green-700">Payment link sent.</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

// remaining is the max refundable — the field defaults to it, but staff
// can lower it for a partial refund (e.g. keeping a deposit for damage).
export function RefundButton({ invoiceId, remaining }: { invoiceId: string; remaining: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [refunding, setRefunding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return <p className="mt-3 text-sm font-medium text-green-700">Refund sent.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-sm font-semibold text-red-600 hover:underline"
      >
        Refund…
      </button>
    );
  }

  async function handleClick() {
    setRefunding(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("amountDollars", amount);
      await refundInvoicePayment(invoiceId, formData);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't process that refund.");
    } finally {
      setRefunding(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
      <label className="text-xs font-medium text-zinc-700">
        Refund amount (up to ${remaining.toFixed(2)})
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          max={remaining}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-28 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={handleClick}
          disabled={refunding}
          className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
        >
          {refunding ? "Refunding…" : "Confirm Refund"}
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
