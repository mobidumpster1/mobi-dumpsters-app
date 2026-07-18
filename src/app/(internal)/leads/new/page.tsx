import Link from "next/link";
import { redirect } from "next/navigation";
import { createLead } from "../actions";
import { Field, inputClass } from "@/components/Field";
import { LEAD_INTAKE_SOURCE_LABELS } from "@/lib/leadStatus";
import { hasPermission, hasPlan, requireUser } from "@/lib/session";

export default async function NewLeadPage() {
  const user = await requireUser();
  if (!hasPermission(user, "canManageLeads") || !hasPlan(user, "team")) redirect("/leads");

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-black tracking-tight text-ink">New Lead</h1>
      <p className="mt-1 text-sm text-zinc-500">
        For a phone call, text, or walk-in inquiry that hasn&apos;t booked
        yet — everything else (business outreach) still comes from a Places
        search below.
      </p>
      <form action={createLead} className="mt-6 flex flex-col gap-4">
        <Field label="Name" htmlFor="name">
          <input id="name" name="name" required className={inputClass} />
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
        <Field label="How did they reach us? (optional)" htmlFor="source">
          <select id="source" name="source" defaultValue="" className={inputClass}>
            <option value="">Not specified</option>
            {Object.entries(LEAD_INTAKE_SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notes" htmlFor="notes">
          <textarea id="notes" name="notes" rows={3} className={inputClass} />
        </Field>
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
          >
            Save Lead
          </button>
          <Link
            href="/leads"
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
