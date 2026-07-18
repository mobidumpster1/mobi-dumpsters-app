"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/Field";
import { addRecurringBill } from "../recurringActions";

// Calls addRecurringBill directly (not via <form action>) so a rejection —
// e.g. the Pro-plan gate — shows a friendly inline error instead of
// crashing to Next's generic error page, same fix already applied
// elsewhere. In normal use a Solo/Team org never reaches this form (the
// page itself redirects away), but this guards the edge case of a plan
// downgrade happening while this page is still open in a stale tab.
export function AddRecurringBillForm() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSaving(true);
    setError(null);
    try {
      await addRecurringBill(new FormData(form));
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that bill.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 flex flex-col gap-4 rounded-lg border-2 border-zinc-900 bg-white p-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name">
          <input id="name" name="name" required className={inputClass} placeholder="e.g. Truck" />
        </Field>
        <Field label="Category" htmlFor="category">
          <input
            id="category"
            name="category"
            required
            className={inputClass}
            placeholder="e.g. Vehicle Payment"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Amount (leave blank if variable)" htmlFor="amount">
          <input id="amount" name="amount" type="number" step="0.01" min="0" className={inputClass} />
        </Field>
        <Field label="Frequency" htmlFor="frequency">
          <select id="frequency" name="frequency" defaultValue="monthly" className={inputClass}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </Field>
        <Field label="Payment Method (optional)" htmlFor="paymentMethod">
          <input
            id="paymentMethod"
            name="paymentMethod"
            className={inputClass}
            placeholder="e.g. Auto (MOBI Checking)"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Due Day of Month (for monthly bills)" htmlFor="dueDay">
          <input id="dueDay" name="dueDay" type="number" min="1" max="31" className={inputClass} />
        </Field>
        <Field label="Due Date (for yearly bills)" htmlFor="dueDate">
          <input id="dueDate" name="dueDate" type="date" className={inputClass} />
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
          {saving ? "Adding…" : "Add Bill"}
        </button>
      </div>
    </form>
  );
}
