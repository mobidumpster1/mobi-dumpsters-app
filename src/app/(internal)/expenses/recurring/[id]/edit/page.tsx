import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Field, inputClass } from "@/components/Field";
import { updateRecurringBill } from "../../../recurringActions";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EditRecurringBillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const bill = await db.recurringBill.findFirst({
    where: { id, organizationId: user.effectiveOrganizationId },
  });

  if (!bill) notFound();

  const updateWithId = updateRecurringBill.bind(null, bill.id);

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-black tracking-tight text-ink">Edit Recurring Bill</h1>
      <form action={updateWithId} className="mt-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name">
            <input id="name" name="name" defaultValue={bill.name} required className={inputClass} />
          </Field>
          <Field label="Category" htmlFor="category">
            <input
              id="category"
              name="category"
              defaultValue={bill.category}
              required
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Amount (leave blank if variable)" htmlFor="amount">
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={bill.amount ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Frequency" htmlFor="frequency">
            <select id="frequency" name="frequency" defaultValue={bill.frequency} className={inputClass}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </Field>
          <Field label="Payment Method (optional)" htmlFor="paymentMethod">
            <input
              id="paymentMethod"
              name="paymentMethod"
              defaultValue={bill.paymentMethod ?? ""}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Due Day of Month (for monthly bills)" htmlFor="dueDay">
            <input
              id="dueDay"
              name="dueDay"
              type="number"
              min="1"
              max="31"
              defaultValue={bill.dueDay ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Due Date (for yearly bills)" htmlFor="dueDate">
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              defaultValue={bill.dueDate ? bill.dueDate.toISOString().slice(0, 10) : ""}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Notes (optional)" htmlFor="notes">
          <input id="notes" name="notes" defaultValue={bill.notes ?? ""} className={inputClass} />
        </Field>

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
          >
            Save Changes
          </button>
          <Link
            href="/expenses/recurring"
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
