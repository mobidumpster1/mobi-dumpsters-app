"use client";

import { useState } from "react";
import { inputClass } from "@/components/Field";

export type PricingTierInput = {
  label: string;
  days: number;
  price: number | null;
};

export function PricingTierBuilder({
  initialTiers = [],
}: {
  initialTiers?: PricingTierInput[];
}) {
  const [tiers, setTiers] = useState<PricingTierInput[]>(initialTiers);

  function updateTier(index: number, patch: Partial<PricingTierInput>) {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function addTier() {
    setTiers((prev) => [...prev, { label: "", days: 1, price: null }]);
  }

  function removeTier(index: number) {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-700">
          Rental Duration Pricing (optional)
        </h3>
        <button
          type="button"
          onClick={addTier}
          className="text-sm font-semibold text-brand hover:underline"
        >
          + Add Duration
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        If this category is a rental with duration-based pricing (like
        &quot;24 Hour&quot;, &quot;7 Day&quot;), add each option here — the
        booking page will let customers pick one instead of freeform dates.
        Leave price blank to show &quot;Call for pricing&quot; for that
        duration. Categories with no durations listed fall back to the base
        price above.
      </p>
      {tiers.length === 0 && (
        <p className="text-sm text-zinc-400">No durations added yet.</p>
      )}
      {tiers.map((tier, index) => (
        <div
          key={index}
          className="grid grid-cols-1 gap-2 rounded-xl border border-zinc-200 p-3 sm:grid-cols-12"
        >
          <input
            className={`${inputClass} sm:col-span-4`}
            placeholder="Label (e.g. 24 Hour)"
            value={tier.label}
            onChange={(e) => updateTier(index, { label: e.target.value })}
          />
          <input
            className={`${inputClass} sm:col-span-3`}
            type="number"
            min="1"
            placeholder="Days"
            value={tier.days}
            onChange={(e) => updateTier(index, { days: Number(e.target.value) || 1 })}
          />
          <input
            className={`${inputClass} sm:col-span-3`}
            type="number"
            step="0.01"
            placeholder="Price ($, blank = Call)"
            value={tier.price ?? ""}
            onChange={(e) =>
              updateTier(index, {
                price: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
          <button
            type="button"
            onClick={() => removeTier(index)}
            className="text-sm text-red-600 hover:underline sm:col-span-2"
          >
            Remove
          </button>
        </div>
      ))}
      <input type="hidden" name="pricingTiersJson" value={JSON.stringify(tiers)} />
    </div>
  );
}
