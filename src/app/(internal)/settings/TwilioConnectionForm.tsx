"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/Field";
import { saveTwilioConnection } from "./actions";

// Calls saveTwilioConnection directly (not via <form action>) so a
// rejection — e.g. the Pro-plan gate — shows a friendly inline error
// instead of crashing to Next's generic error page, same fix already
// applied to the staff-add and SMS-send flows.
export function TwilioConnectionForm({
  mode,
  defaultAccountSid,
  defaultAuthToken,
  defaultPhoneNumber,
}: {
  mode: "connect" | "update";
  defaultAccountSid?: string;
  defaultAuthToken?: string;
  defaultPhoneNumber?: string;
}) {
  const [accountSid, setAccountSid] = useState(defaultAccountSid ?? "");
  const [authToken, setAuthToken] = useState(defaultAuthToken ?? "");
  const [phoneNumber, setPhoneNumber] = useState(defaultPhoneNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("accountSid", accountSid);
      formData.set("authToken", authToken);
      formData.set("phoneNumber", phoneNumber);
      await saveTwilioConnection(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save those Twilio details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={
        mode === "connect"
          ? "mt-4 flex flex-col gap-4"
          : "flex flex-col gap-4 border-t border-zinc-100 pt-4"
      }
    >
      <Field label="Account SID" htmlFor={`accountSid-${mode}`}>
        <input
          id={`accountSid-${mode}`}
          required
          placeholder="AC..."
          className={inputClass}
          value={accountSid}
          onChange={(e) => setAccountSid(e.target.value)}
        />
      </Field>
      <Field label="Auth Token" htmlFor={`authToken-${mode}`}>
        <input
          id={`authToken-${mode}`}
          type="password"
          required
          className={inputClass}
          value={authToken}
          onChange={(e) => setAuthToken(e.target.value)}
        />
      </Field>
      <Field label="Twilio Phone Number" htmlFor={`phoneNumber-${mode}`}>
        <input
          id={`phoneNumber-${mode}`}
          required
          placeholder="+14785550100"
          className={inputClass}
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : mode === "connect" ? "Save Twilio Details" : "Update Twilio Details"}
        </button>
      </div>
    </form>
  );
}
