"use client";

import { useState } from "react";
import { sendQuote } from "./actions";

// Calls sendQuote directly instead of via <form action> so a failed send
// (no email/phone on file, Resend or Twilio not configured) shows a
// friendly inline error instead of crashing to Next's generic error page —
// same fix already applied to the SMS-send and invoice-charge flows.
export function SendQuoteButton({ quoteId }: { quoteId: string }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSending(true);
    setError(null);
    try {
      await sendQuote(quoteId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that quote.");
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
        className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {sending ? "Sending…" : "Send Quote"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
