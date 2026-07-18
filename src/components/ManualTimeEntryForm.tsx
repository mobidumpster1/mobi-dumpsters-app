"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/Field";
import { addManualTimeEntry } from "@/app/(internal)/time/actions";

type UserOption = { id: string; name: string };

// Calls addManualTimeEntry directly (not via <form action>) so a
// validation throw shows a friendly inline error instead of crashing to
// Next's generic error page — the established fix for any new form that
// can throw.
export function ManualTimeEntryForm({ userOptions }: { userOptions: UserOption[] | null }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSaving(true);
    setError(null);
    try {
      await addManualTimeEntry(new FormData(form));
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that entry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {userOptions && (
        <Field label="Staff Member" htmlFor="userId">
          <select id="userId" name="userId" className={inputClass}>
            {userOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Clock In" htmlFor="clockIn">
          <input id="clockIn" name="clockIn" type="datetime-local" required className={inputClass} />
        </Field>
        <Field label="Clock Out (leave blank if still working)" htmlFor="clockOut">
          <input id="clockOut" name="clockOut" type="datetime-local" className={inputClass} />
        </Field>
      </div>
      <Field label="Notes (optional)" htmlFor="notes">
        <input id="notes" name="notes" className={inputClass} />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add Entry"}
        </button>
      </div>
    </form>
  );
}
