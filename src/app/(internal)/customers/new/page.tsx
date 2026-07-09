import Link from "next/link";
import { createCustomer } from "../actions";
import { Field, inputClass } from "@/components/Field";
import { LEAD_SOURCE_LABELS } from "@/lib/leadSource";

export default function NewCustomerPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-bold tracking-tight text-ink">New Customer</h1>
      <form action={createCustomer} className="mt-6 flex flex-col gap-4">
        <Field label="Name" htmlFor="name">
          <input id="name" name="name" required className={inputClass} />
        </Field>
        <Field label="Company (optional)" htmlFor="companyName">
          <input id="companyName" name="companyName" className={inputClass} />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <input id="phone" name="phone" className={inputClass} />
        </Field>
        <Field label="Email" htmlFor="email">
          <input id="email" name="email" type="email" className={inputClass} />
        </Field>
        <Field label="Address" htmlFor="address">
          <input id="address" name="address" className={inputClass} />
        </Field>
        <Field label="How did they find us? (optional)" htmlFor="leadSource">
          <select id="leadSource" name="leadSource" defaultValue="" className={inputClass}>
            <option value="">Not specified</option>
            {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tags (comma separated, optional)" htmlFor="tags">
          <input
            id="tags"
            name="tags"
            placeholder="e.g. Residential, Repeat"
            className={inputClass}
          />
        </Field>
        <Field label="Notes" htmlFor="notes">
          <textarea id="notes" name="notes" rows={3} className={inputClass} />
        </Field>
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Save Customer
          </button>
          <Link
            href="/customers"
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
