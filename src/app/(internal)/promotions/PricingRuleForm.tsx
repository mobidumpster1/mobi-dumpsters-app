"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/Field";
import { createPricingRule } from "./actions";

type CategoryOption = { id: string; name: string };

// A rule is either specific weekdays or a season range, never both — see
// the PricingRule model comment in schema.prisma for why. The UI enforces
// that by only letting one section be filled in at a time (filling one
// clears the other) rather than validating after the fact.
export function PricingRuleForm({ categories }: { categories: CategoryOption[] }) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [adjustmentType, setAdjustmentType] = useState("percent");
  const [adjustmentValue, setAdjustmentValue] = useState("");
  const [appliesSaturday, setAppliesSaturday] = useState(false);
  const [appliesSunday, setAppliesSunday] = useState(false);
  const [seasonStart, setSeasonStart] = useState("");
  const [seasonEnd, setSeasonEnd] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasWeekend = appliesSaturday || appliesSunday;
  const hasSeason = Boolean(seasonStart || seasonEnd);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("categoryId", categoryId);
      formData.set("adjustmentType", adjustmentType);
      formData.set("adjustmentValue", adjustmentValue);
      if (appliesSaturday) formData.set("appliesSaturday", "on");
      if (appliesSunday) formData.set("appliesSunday", "on");
      formData.set("seasonStart", seasonStart);
      formData.set("seasonEnd", seasonEnd);
      await createPricingRule(formData);
      setName("");
      setAdjustmentValue("");
      setAppliesSaturday(false);
      setAppliesSunday(false);
      setSeasonStart("");
      setSeasonEnd("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create that rule.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border-2 border-zinc-900 bg-white p-5">
      <p className="text-sm font-medium text-ink">New Pricing Rule</p>
      <p className="text-xs text-zinc-500">
        Applies automatically on the online booking page — a delivery date that matches gets the
        surcharge added before any promo code discount.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Field label="Name" htmlFor="ruleName">
          <input
            id="ruleName"
            required
            placeholder="Weekend Delivery"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Category (optional)" htmlFor="ruleCategoryId">
          <select
            id="ruleCategoryId"
            className={inputClass}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type" htmlFor="ruleType">
          <select
            id="ruleType"
            className={inputClass}
            value={adjustmentType}
            onChange={(e) => setAdjustmentType(e.target.value)}
          >
            <option value="percent">Percent surcharge</option>
            <option value="flat">Dollars surcharge</option>
          </select>
        </Field>
        <Field label="Amount" htmlFor="ruleValue">
          <input
            id="ruleValue"
            type="number"
            min="0"
            step="0.01"
            required
            className={inputClass}
            value={adjustmentValue}
            onChange={(e) => setAdjustmentValue(e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 p-3">
          <p className="mb-2 text-xs font-medium text-zinc-500">Specific weekdays</p>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={appliesSaturday}
                disabled={hasSeason}
                onChange={(e) => setAppliesSaturday(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Saturday
            </label>
            <label className="flex items-center gap-1.5 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={appliesSunday}
                disabled={hasSeason}
                onChange={(e) => setAppliesSunday(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Sunday
            </label>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 p-3">
          <p className="mb-2 text-xs font-medium text-zinc-500">
            Season range (recurs every year — no year needed)
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="MM-DD (e.g. 06-01)"
              disabled={hasWeekend}
              className={`${inputClass} text-sm`}
              value={seasonStart}
              onChange={(e) => setSeasonStart(e.target.value)}
            />
            <span className="text-zinc-400">to</span>
            <input
              type="text"
              placeholder="MM-DD (e.g. 08-31)"
              disabled={hasWeekend}
              className={`${inputClass} text-sm`}
              value={seasonEnd}
              onChange={(e) => setSeasonEnd(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <button
          type="submit"
          disabled={adding}
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {adding ? "Adding…" : "+ Create Rule"}
        </button>
      </div>
    </form>
  );
}
