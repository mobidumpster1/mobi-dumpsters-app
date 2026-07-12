"use client";

import { useState } from "react";

// Shown to any logged-in user whose email hasn't been verified yet —
// covers fresh /signup accounts (already sent one automatically) and
// staff accounts an owner created by hand (never sent one until now).
export function VerifyEmailBanner({ action }: { action: () => Promise<void> }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleClick() {
    setSending(true);
    await action();
    setSending(false);
    setSent(true);
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm text-amber-900">
      <span>Verify your email so password recovery works if you ever get locked out.</span>
      {sent ? (
        <span className="text-xs font-semibold text-amber-900">
          Verification email sent — check your inbox.
        </span>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={sending}
          className="rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
        >
          {sending ? "Sending…" : "Resend Verification Email"}
        </button>
      )}
    </div>
  );
}
