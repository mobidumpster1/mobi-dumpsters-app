"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, inputClass } from "@/components/Field";

type CustomerOption = { id: string; name: string };

type InitialValues = {
  customerId: string | null;
  structureDescription: string;
  propertyAddress: string;
  dimensions: string | null;
  foundationRemovalIncluded: boolean;
  quotedPrice: number;
  depositDue: number | null;
  balanceDue: number | null;
};

// Calls the create/update action directly (not via <form action>) so a
// validation throw shows a friendly inline error instead of crashing to
// Next's generic error page — same fix as AutomationTriggerBuilder, and
// for the same reason: several validation paths exist here (missing
// structure description, missing address, bad price).
export function DemolitionAgreementForm({
  action,
  customers,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (formData: FormData) => Promise<void>;
  customers: CustomerOption[];
  initial?: InitialValues;
  submitLabel: string;
  cancelHref: string;
}) {
  const [quotedPrice, setQuotedPrice] = useState(initial?.quotedPrice?.toString() ?? "");
  const [depositDue, setDepositDue] = useState(initial?.depositDue?.toString() ?? "");
  const [balanceDue, setBalanceDue] = useState(initial?.balanceDue?.toString() ?? "");
  const [depositTouched, setDepositTouched] = useState(Boolean(initial?.depositDue));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePriceChange(value: string) {
    setQuotedPrice(value);
    const price = Number(value);
    if (!depositTouched && price > 0) {
      const deposit = Math.round(price * 0.5 * 100) / 100;
      setDepositDue(deposit.toString());
      setBalanceDue((Math.round((price - deposit) * 100) / 100).toString());
    }
  }

  function handleDepositChange(value: string) {
    setDepositTouched(true);
    setDepositDue(value);
    const price = Number(quotedPrice);
    const deposit = Number(value);
    if (price > 0 && !Number.isNaN(deposit)) {
      setBalanceDue((Math.round((price - deposit) * 100) / 100).toString());
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await action(new FormData(e.currentTarget));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that agreement.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Link to an existing customer (optional)" htmlFor="customerId">
        <select
          id="customerId"
          name="customerId"
          defaultValue={initial?.customerId ?? ""}
          className={inputClass}
        >
          <option value="">Not linked yet — the customer will fill in their info when they sign</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Structure(s) to be demolished" htmlFor="structureDescription">
        <input
          id="structureDescription"
          name="structureDescription"
          required
          defaultValue={initial?.structureDescription}
          className={inputClass}
          placeholder="e.g. Shed and detached garage"
        />
      </Field>

      <Field label="Property address / job site" htmlFor="propertyAddress">
        <input
          id="propertyAddress"
          name="propertyAddress"
          required
          defaultValue={initial?.propertyAddress}
          className={inputClass}
        />
      </Field>

      <Field label="Approximate dimensions (L x W x H)" htmlFor="dimensions">
        <input
          id="dimensions"
          name="dimensions"
          defaultValue={initial?.dimensions ?? ""}
          className={inputClass}
          placeholder="e.g. 20' x 15' x 10'"
        />
      </Field>

      <label className="flex items-center gap-3 text-sm font-medium text-zinc-700">
        <input
          type="checkbox"
          name="foundationRemovalIncluded"
          defaultChecked={initial?.foundationRemovalIncluded ?? false}
          className="h-5 w-5 rounded border-zinc-300"
        />
        Foundation, slab, or driveway removal included
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Quoted price" htmlFor="quotedPrice">
          <input
            id="quotedPrice"
            name="quotedPrice"
            type="number"
            step="0.01"
            min="0"
            required
            value={quotedPrice}
            onChange={(e) => handlePriceChange(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Deposit due" htmlFor="depositDue">
          <input
            id="depositDue"
            name="depositDue"
            type="number"
            step="0.01"
            min="0"
            value={depositDue}
            onChange={(e) => handleDepositChange(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Balance due at completion" htmlFor="balanceDue">
          <input
            id="balanceDue"
            name="balanceDue"
            type="number"
            step="0.01"
            min="0"
            value={balanceDue}
            onChange={(e) => setBalanceDue(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <p className="-mt-2 text-xs text-zinc-500">
        Deposit defaults to 50% of the quoted price and balance auto-fills to the
        remainder — both are editable if this job needs different terms.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
