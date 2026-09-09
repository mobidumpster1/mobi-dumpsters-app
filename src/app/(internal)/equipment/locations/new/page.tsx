import Link from "next/link";
import { createLocation } from "../actions";
import { Field, inputClass } from "@/components/Field";

export default function NewLocationPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-black tracking-tight text-ink">New Location</h1>
      <p className="mt-1 text-sm text-zinc-500">
        A depot/yard equipment can be based out of.
      </p>
      <form action={createLocation} className="mt-6 flex flex-col gap-4">
        <Field label="Name" htmlFor="name">
          <input
            id="name"
            name="name"
            required
            placeholder="e.g. North Yard"
            className={inputClass}
          />
        </Field>
        <Field label="Address" htmlFor="address">
          <input id="address" name="address" required className={inputClass} />
        </Field>
        <Field label="Notes (optional)" htmlFor="notes">
          <textarea id="notes" name="notes" rows={2} className={inputClass} />
        </Field>
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
          >
            Save Location
          </button>
          <Link
            href="/equipment/locations"
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
