"use client";

import { useState } from "react";
import { chargeInstallmentViaStripe, sendInstallmentCheckoutLink } from "./installmentActions";

// Same try/catch pattern as InvoicePaymentActions, parameterized by
// installment instead of the whole invoice.
export function ChargeInstallmentButton({
  installmentId,
  amount,
}: {
  installmentId: string;
  amount: number;
}) {
  const [charging, setCharging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setCharging(true);
    setError(null);
    try {
      await chargeInstallmentViaStripe(installmentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't charge that card.");
    } finally {
      setCharging(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={charging}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {charging ? "Charging…" : `Charge $${amount.toFixed(2)}`}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function SendInstallmentCheckoutLinkButton({ installmentId }: { installmentId: string }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleClick() {
    setSending(true);
    setError(null);
    try {
      await sendInstallmentCheckoutLink(installmentId);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that payment link.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={sending}
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
      >
        {sending ? "Sending…" : "Send Payment Link"}
      </button>
      {sent && <p className="mt-1 text-sm font-medium text-green-700">Payment link sent.</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
