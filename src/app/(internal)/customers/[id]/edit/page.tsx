import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { updateCustomer } from "../../actions";
import { Field, inputClass } from "@/components/Field";
import { LEAD_SOURCE_LABELS } from "@/lib/leadSource";
import { requireUser } from "@/lib/session";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const customer = await db.customer.findFirst({
    where: { id, organizationId: user.effectiveOrganizationId },
  });
  if (!customer) notFound();

  const updateWithId = updateCustomer.bind(null, customer.id);

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Edit Customer</h1>
      <form action={updateWithId} className="mt-6 flex flex-col gap-4">
        <Field label="Name" htmlFor="name">
          <input
            id="name"
            name="name"
            defaultValue={customer.name}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Company (optional)" htmlFor="companyName">
          <input
            id="companyName"
            name="companyName"
            defaultValue={customer.companyName ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <input
            id="phone"
            name="phone"
            defaultValue={customer.phone ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Email" htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={customer.email ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Address" htmlFor="address">
          <input
            id="address"
            name="address"
            defaultValue={customer.address ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="How did they find us? (optional)" htmlFor="leadSource">
          <select
            id="leadSource"
            name="leadSource"
            defaultValue={customer.leadSource ?? ""}
            className={inputClass}
          >
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
            defaultValue={customer.tags}
            placeholder="e.g. Residential, Repeat"
            className={inputClass}
          />
        </Field>
        <Field label="Notes" htmlFor="notes">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={customer.notes ?? ""}
            className={inputClass}
          />
        </Field>
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Save Changes
          </button>
          <Link
            href={`/customers/${customer.id}`}
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
