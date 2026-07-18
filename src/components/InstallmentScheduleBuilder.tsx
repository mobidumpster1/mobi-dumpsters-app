"use client";

import { useState } from "react";
import { inputClass } from "@/components/Field";

type InstallmentRow = { label: string; amount: string; dueDate: string };

function emptyRow(): InstallmentRow {
  return { label: "", amount: "", dueDate: "" };
}

// Calls createPaymentSchedule directly (not via <form action>) so a
// rejection — e.g. the totals not matching the invoice amount — shows a
// friendly inline error instead of crashing to Next's generic error page.
// Row-editing pattern mirrors QuoteLineItemsBuilder.
export function InstallmentScheduleBuilder({
  invoiceAmount,
  createAction,
}: {
  invoiceAmount: number;
  createAction: (formData: FormData) => Promise<void>;
}) {
  const [rows, setRows] = useState<InstallmentRow[]>([
    { label: "Deposit", amount: "", dueDate: "" },
    { label: "Balance", amount: "", dueDate: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(index: number, patch: Partial<InstallmentRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  const total = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const matchesInvoice = Math.abs(total - invoiceAmount) < 0.01;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("installmentsJson", JSON.stringify(rows));
      await createAction(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create that payment schedule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {rows.map((row, index) => (
        <div
          key={index}
          className="grid grid-cols-1 gap-2 rounded-xl border border-zinc-200 p-3 sm:grid-cols-12"
        >
          <input
            type="text"
            placeholder="e.g. Deposit"
            className={`${inputClass} sm:col-span-4`}
            value={row.label}
            onChange={(e) => updateRow(index, { label: e.target.value })}
            required
          />
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Amount"
            className={`${inputClass} sm:col-span-3`}
            value={row.amount}
            onChange={(e) => updateRow(index, { amount: e.target.value })}
            required
          />
          <input
            type="date"
            className={`${inputClass} sm:col-span-4`}
            value={row.dueDate}
            onChange={(e) => updateRow(index, { dueDate: e.target.value })}
          />
          <button
            type="button"
            onClick={() => removeRow(index)}
            className="rounded-xl py-2 text-sm font-medium text-red-600 hover:underline sm:col-span-1 sm:py-0"
          >
            Remove
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addRow}
          className="text-sm font-semibold text-brand hover:underline"
        >
          + Add Payment
        </button>
        <p className={`text-sm font-semibold ${matchesInvoice ? "text-zinc-700" : "text-red-600"}`}>
          Total: ${total.toFixed(2)} of ${invoiceAmount.toFixed(2)}
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <button
          type="submit"
          disabled={saving || !matchesInvoice}
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : "Create Payment Schedule"}
        </button>
      </div>
    </form>
  );
}
