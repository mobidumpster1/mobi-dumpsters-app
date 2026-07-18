"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/Field";
import { sendCustomerSmsMessage } from "./actions";

export function SendSmsForm({ customerId }: { customerId: string }) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    try {
      await sendCustomerSmsMessage(customerId, body);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that text.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 flex flex-col gap-3 rounded-lg border-2 border-zinc-900 bg-white p-5"
    >
      <Field label="Text Message" htmlFor="body">
        <textarea
          id="body"
          rows={2}
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message to text this customer…"
          className={inputClass}
        />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send Text"}
        </button>
      </div>
    </form>
  );
}
