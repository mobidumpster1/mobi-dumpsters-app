"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/Field";
import { createPromoCode } from "./actions";

// Calls createPromoCode directly (not via <form action>) so a rejection —
// a duplicate code, an over-100% percent, a zero amount — shows a
// friendly inline error instead of crashing to Next's generic error page.
export function PromoCodeForm() {
  const [code, setCode] = useState("");
  const [type, setType] = useState("percent");
  const [value, setValue] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("code", code);
      formData.set("type", type);
      formData.set("value", value);
      formData.set("expiresAt", expiresAt);
      formData.set("maxRedemptions", maxRedemptions);
      await createPromoCode(formData);
      setCode("");
      setValue("");
      setExpiresAt("");
      setMaxRedemptions("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create that code.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border-2 border-zinc-900 bg-white p-5">
      <p className="text-sm font-medium text-ink">New Promo Code</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Field label="Code" htmlFor="code">
          <input
            id="code"
            required
            placeholder="SAVE10"
            className={`${inputClass} uppercase`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </Field>
        <Field label="Type" htmlFor="type">
          <select id="type" className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="percent">Percent off</option>
            <option value="flat">Dollars off</option>
          </select>
        </Field>
        <Field label="Amount" htmlFor="value">
          <input
            id="value"
            type="number"
            min="0"
            step="0.01"
            required
            className={inputClass}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <Field label="Max Redemptions (optional)" htmlFor="maxRedemptions">
          <input
            id="maxRedemptions"
            type="number"
            min="1"
            step="1"
            placeholder="Unlimited"
            className={inputClass}
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Expires (optional)" htmlFor="expiresAt">
        <input
          id="expiresAt"
          type="date"
          className={`${inputClass} max-w-[200px]`}
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <button
          type="submit"
          disabled={adding}
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {adding ? "Adding…" : "+ Create Code"}
        </button>
      </div>
    </form>
  );
}
