import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { markExpensePaid, markExpenseUnpaid } from "../actions";
import { uploadExpenseReceipt, deleteExpenseReceipt } from "../receiptActions";
import { Field, inputClass } from "@/components/Field";
import { GalleryImage } from "@/components/GalleryImage";

export const dynamic = "force-dynamic";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const expense = await db.expense.findUnique({
    where: { id },
    include: {
      booking: { include: { customer: true } },
      equipmentItem: true,
      receipts: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!expense) notFound();

  const markPaidWithId = markExpensePaid.bind(null, expense.id);
  const markUnpaidWithId = markExpenseUnpaid.bind(null, expense.id);
  const uploadReceiptWithId = uploadExpenseReceipt.bind(null, expense.id);

  return (
    <div className="max-w-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            {expense.vendor}
          </h1>
          <p className="mt-1 text-zinc-500">{expense.category}</p>
          {expense.quickbooksPurchaseId && (
            <p className="mt-1 text-xs text-zinc-400">Synced to QuickBooks</p>
          )}
        </div>
        <div className="flex gap-3">
          <Link
            href={`/expenses/${expense.id}/edit`}
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Edit
          </Link>
          <span
            className={`inline-block self-center rounded-full px-3 py-1 text-sm font-medium capitalize ${
              expense.status === "paid"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {expense.status}
          </span>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm text-sm">
        <div>
          <dt className="text-zinc-500">Amount</dt>
          <dd className="text-zinc-900">${expense.amount.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Date</dt>
          <dd className="text-zinc-900">{formatDate(expense.date)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Due Date</dt>
          <dd className="text-zinc-900">
            {expense.dueDate ? formatDate(expense.dueDate) : "—"}
          </dd>
        </div>
        {expense.status === "paid" && (
          <div>
            <dt className="text-zinc-500">Paid Date</dt>
            <dd className="text-zinc-900">
              {expense.paidDate ? formatDate(expense.paidDate) : "—"}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-zinc-500">Linked Job</dt>
          <dd className="text-zinc-900">
            {expense.booking ? (
              <Link href={`/bookings/${expense.booking.id}`} className="hover:underline">
                {expense.booking.customer.name}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Linked Equipment</dt>
          <dd className="text-zinc-900">
            {expense.equipmentItem ? (
              <Link
                href={`/equipment/${expense.equipmentItem.id}`}
                className="hover:underline"
              >
                {expense.equipmentItem.label}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
        {expense.notes && (
          <div className="col-span-full">
            <dt className="text-zinc-500">Notes</dt>
            <dd className="text-zinc-900">{expense.notes}</dd>
          </div>
        )}
      </dl>

      <div className="mt-6">
        {expense.status === "paid" ? (
          <form action={markUnpaidWithId}>
            <button
              type="submit"
              className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Mark Unpaid
            </button>
          </form>
        ) : (
          <form action={markPaidWithId}>
            <button
              type="submit"
              className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Mark Paid
            </button>
          </form>
        )}
      </div>

      <h2 className="mt-8 text-xl font-semibold text-ink">Receipts</h2>
      <form
        action={uploadReceiptWithId}
        className="mt-3 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <Field label="Photo" htmlFor="file">
          <input
            id="file"
            name="file"
            type="file"
            accept="image/*"
            capture="environment"
            required
            className={inputClass}
          />
        </Field>
        <div>
          <button
            type="submit"
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Add Receipt
          </button>
        </div>
      </form>

      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {expense.receipts.map((receipt, i) => (
          <div
            key={receipt.id}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
          >
            <GalleryImage
              images={expense.receipts.map((r) => ({
                src: `/api/uploads/${r.filePath}`,
                alt: "Receipt",
              }))}
              index={i}
              className="h-40 w-full object-cover"
            />
            <div className="p-2">
              <form action={deleteExpenseReceipt.bind(null, receipt.id)}>
                <button
                  type="submit"
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {expense.receipts.length === 0 && (
          <p className="col-span-full text-center text-zinc-400">
            No receipts yet.
          </p>
        )}
      </div>
    </div>
  );
}
