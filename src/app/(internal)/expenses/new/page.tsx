import Link from "next/link";
import { db } from "@/lib/db";
import { createExpense } from "../actions";
import { Field, inputClass } from "@/components/Field";
import { EXPENSE_CATEGORIES } from "@/lib/expenseCategories";
import { formatDate } from "@/lib/date";

export const dynamic = "force-dynamic";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default async function NewExpensePage() {
  const [bookings, equipmentItems] = await Promise.all([
    db.booking.findMany({
      orderBy: { createdAt: "desc" },
      include: { customer: true },
    }),
    db.equipmentItem.findMany({ orderBy: { label: "asc" } }),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-bold tracking-tight text-ink">New Expense</h1>
      <form action={createExpense} className="mt-6 flex flex-col gap-4">
        <Field label="Vendor" htmlFor="vendor">
          <input
            id="vendor"
            name="vendor"
            required
            placeholder="e.g. Shell, Waste Pro, ABC Rentals"
            className={inputClass}
          />
        </Field>
        <Field label="Category" htmlFor="category">
          <input
            id="category"
            name="category"
            required
            list="expense-categories"
            className={inputClass}
          />
          <datalist id="expense-categories">
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Amount" htmlFor="amount">
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            required
            className={inputClass}
          />
        </Field>
        <Field label="Date" htmlFor="date">
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={todayStr()}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Due Date (optional)" htmlFor="dueDate">
          <input id="dueDate" name="dueDate" type="date" className={inputClass} />
        </Field>
        <Field label="Link to Job (optional)" htmlFor="bookingId">
          <select id="bookingId" name="bookingId" className={inputClass}>
            <option value="">None</option>
            {bookings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.customer.name} — {formatDate(b.createdAt)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Link to Equipment (optional)" htmlFor="equipmentItemId">
          <select id="equipmentItemId" name="equipmentItemId" className={inputClass}>
            <option value="">None</option>
            {equipmentItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
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
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Save Expense
          </button>
          <Link
            href="/expenses"
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
