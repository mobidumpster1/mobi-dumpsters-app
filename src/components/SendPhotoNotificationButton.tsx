"use client";

import { useState } from "react";

export function SendPhotoNotificationButton({
  bookingId,
  type,
  label,
  action,
}: {
  bookingId: string;
  type: "delivery" | "pickup";
  label: string;
  action: (bookingId: string, type: "delivery" | "pickup") => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setMessage(null);
          try {
            await action(bookingId, type);
            setMessage({ text: "Sent!", error: false });
          } catch (err) {
            setMessage({
              text: err instanceof Error ? err.message : "Couldn't send that.",
              error: true,
            });
          } finally {
            setPending(false);
          }
        }}
        className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
      >
        {pending ? "Sending…" : label}
      </button>
      {message && (
        <p className={`mt-1 text-xs ${message.error ? "text-red-600" : "text-green-700"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
