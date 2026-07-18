"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/Field";
import { addStaffUser } from "./staffActions";

// Calls addStaffUser directly (not via <form action>) so a rejection —
// e.g. the Solo-plan seat cap — shows a friendly inline error instead of
// crashing to Next's generic error page, same fix already applied to the
// SMS-send and invoice-charge flows earlier.
export function AddStaffForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [canManageTime, setCanManageTime] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("email", email);
      formData.set("password", password);
      formData.set("hourlyRate", hourlyRate);
      if (canManageTime) formData.set("canManageTime", "on");
      await addStaffUser(formData);
      setName("");
      setEmail("");
      setPassword("");
      setHourlyRate("");
      setCanManageTime(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that staff account.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 flex flex-col gap-4 border-t border-zinc-100 pt-4"
    >
      <p className="text-sm font-medium text-ink">Add a Staff Account</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Name" htmlFor="staffName">
          <input
            id="staffName"
            required
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Email" htmlFor="staffEmail">
          <input
            id="staffEmail"
            type="email"
            required
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Temporary Password" htmlFor="staffPassword">
          <input
            id="staffPassword"
            required
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Hourly Rate (for Track Time, optional)" htmlFor="staffHourlyRate">
          <input
            id="staffHourlyRate"
            type="number"
            step="0.01"
            min="0"
            className={inputClass}
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={canManageTime}
          onChange={(e) => setCanManageTime(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300"
        />
        Can edit/delete other staff&apos;s time entries
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <button
          type="submit"
          disabled={adding}
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {adding ? "Adding…" : "+ Add Staff Account"}
        </button>
      </div>
    </form>
  );
}
