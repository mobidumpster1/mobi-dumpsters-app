"use client";

import { useState } from "react";
import { inputClass } from "@/components/Field";

export type MaterialOptionInput = {
  name: string;
  unit: string;
  pricePerUnit: number;
};

export function MaterialOptionBuilder({
  initialOptions = [],
}: {
  initialOptions?: MaterialOptionInput[];
}) {
  const [options, setOptions] = useState<MaterialOptionInput[]>(initialOptions);

  function updateOption(index: number, patch: Partial<MaterialOptionInput>) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  function addOption() {
    setOptions((prev) => [...prev, { name: "", unit: "yd", pricePerUnit: 0 }]);
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-700">
          Material Price List (optional)
        </h3>
        <button
          type="button"
          onClick={addOption}
          className="text-sm font-semibold text-brand hover:underline"
        >
          + Add Material
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        For categories priced by material and quantity (like Material
        Delivery) instead of a flat price or rental duration — the booking
        page shows a material + quantity picker and calculates the total
        live. Categories with no materials listed fall back to the base
        price above.
      </p>
      {options.length === 0 && (
        <p className="text-sm text-zinc-400">No materials added yet.</p>
      )}
      {options.map((option, index) => (
        <div
          key={index}
          className="grid grid-cols-1 gap-2 rounded-xl border border-zinc-200 p-3 sm:grid-cols-12"
        >
          <input
            className={`${inputClass} sm:col-span-5`}
            placeholder="Name (e.g. Mulch (Black/Brown/Red))"
            value={option.name}
            onChange={(e) => updateOption(index, { name: e.target.value })}
          />
          <input
            className={`${inputClass} sm:col-span-3`}
            placeholder="Unit (e.g. yd, ton, bale)"
            value={option.unit}
            onChange={(e) => updateOption(index, { unit: e.target.value })}
          />
          <input
            className={`${inputClass} sm:col-span-2`}
            type="number"
            step="0.01"
            min="0"
            placeholder="Price/unit"
            value={option.pricePerUnit}
            onChange={(e) =>
              updateOption(index, { pricePerUnit: Number(e.target.value) || 0 })
            }
          />
          <button
            type="button"
            onClick={() => removeOption(index)}
            className="text-sm text-red-600 hover:underline sm:col-span-2"
          >
            Remove
          </button>
        </div>
      ))}
      <input type="hidden" name="materialOptionsJson" value={JSON.stringify(options)} />
    </div>
  );
}
