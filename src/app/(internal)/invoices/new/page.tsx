import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { createInvoice } from "../actions";
import { Field, inputClass } from "@/components/Field";
import { computeInvoiceLineItems } from "@/lib/invoicing";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function plusDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const { bookingId } = await searchParams;
  if (!bookingId) notFound();

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: true,
      items: { include: { equipmentItem: { include: { category: true } } } },
    },
  });
  if (!booking) notFound();

  const lines = computeInvoiceLineItems(booking.items);
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  const invoiceCount = await db.invoice.count();
  const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(4, "0")}`;

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-bold tracking-tight text-ink">New Invoice</h1>
      <p className="mt-1 text-sm text-zinc-500">
        For {booking.customer.name} —{" "}
        {booking.items.map((i) => i.equipmentItem.label).join(", ")}
      </p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Line Item</th>
              <th className="px-5 py-3.5 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {lines.map((line, i) => (
              <tr key={i}>
                <td className="px-5 py-4 text-zinc-900">{line.description}</td>
                <td className="px-5 py-4 text-zinc-600">
                  ${line.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="px-5 py-4 text-right font-medium text-zinc-500">
                Total
              </td>
              <td className="px-5 py-4 font-medium text-zinc-900">
                ${total.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Calculated from each item&apos;s category pricing rules and actual
        usage. To adjust rates, edit the equipment category.
      </p>

      <form action={createInvoice} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="bookingId" value={booking.id} />
        <Field label="Invoice Number" htmlFor="invoiceNumber">
          <input
            id="invoiceNumber"
            name="invoiceNumber"
            defaultValue={invoiceNumber}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Issue Date" htmlFor="issueDate">
          <input
            id="issueDate"
            name="issueDate"
            type="date"
            defaultValue={todayStr()}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Due Date" htmlFor="dueDate">
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={plusDays(14)}
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
            Create Invoice
          </button>
          <Link
            href={`/bookings/${booking.id}`}
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
