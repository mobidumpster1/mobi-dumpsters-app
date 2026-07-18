"use client";

import { useState } from "react";
import { chargeInvoiceViaStripe, sendInvoiceCheckoutLink } from "./actions";

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
