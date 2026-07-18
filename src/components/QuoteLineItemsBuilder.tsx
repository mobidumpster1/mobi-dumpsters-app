"use client";

import { useState } from "react";
import { inputClass } from "@/components/Field";

type CategoryOption = { id: string; name: string; basePrice: number | null };

type LineRow = {
  categoryId: string; // "" means a custom/free-text line
  description: string;
  amount: string;
  quantity: string;
  // A customer-selectable add-on, shown pre-checked (opt-out) on the
  // public quote page — see acceptQuote in src/app/quote/[token]/actions.ts.
  optional: boolean;
};

const CUSTOM = "";

function emptyRow(): LineRow {
  return { categoryId: CUSTOM, description: "", amount: "", quantity: "1", optional: false };
}

// Lets staff price out a quote by equipment category (auto-filling the
// category's base price as a starting, editable amount) or as a free-text
// line for anything without a category — e.g. a one-off labor charge.
// Deliberately doesn't ask staff to pick a specific serialized EquipmentItem
// this early: a quote is a rough estimate, sometimes weeks before the job,
// and locking in one unit now just means it might not be the one actually
// available when the quote gets accepted. Real unit + dates get picked
// during the normal pending-booking review once a quote is accepted.
export function QuoteLineItemsBuilder({
  categoryOptions,
}: {
  categoryOptions: CategoryOption[];
}) {
  const [rows, setRows] = useState<LineRow[]>([emptyRow()]);

  function updateRow(index: number, patch: Partial<LineRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function handleCategoryChange(index: number, categoryId: string) {
    const category = categoryOptions.find((c) => c.id === categoryId);
    updateRow(index, {
      categoryId,
      description: category ? category.name : "",
      amount: category?.basePrice != null ? String(category.basePrice) : "",
    });
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  const total = rows.reduce(
    (sum, r) => sum + (Number(r.amount) || 0) * (Number(r.quantity) || 1),
    0
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-700">Line Items</h3>
        <button
          type="button"
          onClick={addRow}
          className="text-sm font-semibold text-brand hover:underline"
        >
          + Add Line
        </button>
      </div>
      {rows.map((row, index) => (
        <div
          key={index}
          className="grid grid-cols-1 gap-2 rounded-xl border border-zinc-200 p-3 sm:grid-cols-12"
        >
          <select
            className={`${inputClass} sm:col-span-3`}
            value={row.categoryId}
            onChange={(e) => handleCategoryChange(index, e.target.value)}
          >
            <option value={CUSTOM}>Custom line…</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Description"
            className={`${inputClass} sm:col-span-4`}
            value={row.description}
            onChange={(e) => updateRow(index, { description: e.target.value })}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Amount"
            className={`${inputClass} sm:col-span-2`}
            value={row.amount}
            onChange={(e) => updateRow(index, { amount: e.target.value })}
            required
          />
          <input
            type="number"
            step="1"
            min="1"
            placeholder="Qty"
            className={`${inputClass} sm:col-span-2`}
            value={row.quantity}
            onChange={(e) => updateRow(index, { quantity: e.target.value })}
          />
          <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 sm:col-span-9">
            <input
              type="checkbox"
              checked={row.optional}
              onChange={(e) => updateRow(index, { optional: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Optional (customer add-on)
          </label>
          <button
            type="button"
            onClick={() => removeRow(index)}
            className="rounded-xl py-2 text-sm font-medium text-red-600 hover:underline sm:col-span-3 sm:py-0"
          >
            Remove
          </button>
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-zinc-400">No line items added.</p>}
      <p className="text-right text-sm font-semibold text-zinc-700">
        Total: ${total.toFixed(2)}
      </p>
      <input
        type="hidden"
        name="lineItemsJson"
        value={JSON.stringify(
          rows.map((r) => ({
            description: r.description,
            amount: r.amount,
            quantity: r.quantity,
            optional: r.optional,
          }))
        )}
      />
    </div>
  );
}
