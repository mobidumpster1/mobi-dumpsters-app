import Link from "next/link";
import { db } from "@/lib/db";
import { Field, inputClass } from "@/components/Field";
import { ConfirmButton } from "@/components/ConfirmButton";
import {
  addRecurringBill,
  toggleRecurringBillActive,
  deleteRecurringBill,
  logRecurringBillAsExpense,
} from "../recurringActions";

export const dynamic = "force-dynamic";

function ordinal(day: number) {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function BillRow({
  bill,
}: {
  bill: {
    id: string;
    name: string;
    category: string;
    amount: number | null;
    frequency: string;
    dueDay: number | null;
    dueDate: Date | null;
    paymentMethod: string | null;
    active: boolean;
  };
}) {
  const due =
    bill.frequency === "monthly"
      ? bill.dueDay
        ? `${ordinal(bill.dueDay)} of the month`
        : "—"
      : bill.dueDate
        ? bill.dueDate.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })
        : "—";

  return (
    <tr className={bill.active ? "" : "opacity-50"}>
      <td className="px-5 py-4">
        <p className="font-medium text-zinc-900">{bill.name}</p>
        <p className="text-xs text-zinc-500">{bill.category}</p>
      </td>
      <td className="px-5 py-4 text-zinc-600">
        {bill.amount != null ? `$${bill.amount.toFixed(2)}` : "Variable"}
      </td>
      <td className="px-5 py-4 text-zinc-600">{due}</td>
      <td className="px-5 py-4 text-zinc-600">{bill.paymentMethod ?? "—"}</td>
      <td className="px-5 py-4">
        <div className="flex flex-wrap gap-3">
          <form action={logRecurringBillAsExpense.bind(null, bill.id)}>
            <button type="submit" className="text-sm font-semibold text-brand hover:underline">
              Log as Expense
            </button>
          </form>
          <Link
            href={`/expenses/recurring/${bill.id}/edit`}
            className="text-sm font-semibold text-zinc-600 hover:underline"
          >
            Edit
          </Link>
          <form action={toggleRecurringBillActive.bind(null, bill.id, bill.active)}>
            <button type="submit" className="text-sm font-semibold text-zinc-600 hover:underline">
              {bill.active ? "Deactivate" : "Reactivate"}
            </button>
          </form>
          <form action={deleteRecurringBill.bind(null, bill.id)}>
            <ConfirmButton
              message={`Delete "${bill.name}" from recurring bills? This can't be undone.`}
              className="text-sm font-semibold text-red-600 hover:underline"
            >
              Delete
            </ConfirmButton>
          </form>
        </div>
      </td>
    </tr>
  );
}

export default async function RecurringBillsPage() {
  const bills = await db.recurringBill.findMany({ orderBy: { name: "asc" } });
  const monthly = bills.filter((b) => b.frequency === "monthly");
  const yearly = bills.filter((b) => b.frequency === "yearly");

  const monthlyTotal = monthly
    .filter((b) => b.active && b.amount != null)
    .reduce((sum, b) => sum + (b.amount ?? 0), 0);
  const yearlyTotal = yearly
    .filter((b) => b.active && b.amount != null)
    .reduce((sum, b) => sum + (b.amount ?? 0), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Recurring Bills</h1>
          <p className="mt-1 text-zinc-500">
            Loan payments, subscriptions, and other bills that repeat on a
            schedule. Monthly total: ${monthlyTotal.toFixed(2)} · Yearly
            total: ${yearlyTotal.toFixed(2)}
          </p>
        </div>
        <Link
          href="/expenses"
          className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Back to Expenses
        </Link>
      </div>

      <h2 className="mt-8 text-xl font-semibold text-ink">Monthly</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Bill</th>
              <th className="px-5 py-3.5 font-semibold">Amount</th>
              <th className="px-5 py-3.5 font-semibold">Due</th>
              <th className="px-5 py-3.5 font-semibold">Payment Method</th>
              <th className="px-5 py-3.5 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {monthly.map((bill) => (
              <BillRow key={bill.id} bill={bill} />
            ))}
            {monthly.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  No monthly bills yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-xl font-semibold text-ink">Yearly</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Bill</th>
              <th className="px-5 py-3.5 font-semibold">Amount</th>
              <th className="px-5 py-3.5 font-semibold">Due</th>
              <th className="px-5 py-3.5 font-semibold">Payment Method</th>
              <th className="px-5 py-3.5 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {yearly.map((bill) => (
              <BillRow key={bill.id} bill={bill} />
            ))}
            {yearly.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  No yearly bills yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-xl font-semibold text-ink">Add a Recurring Bill</h2>
      <form
        action={addRecurringBill}
        className="mt-3 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name">
            <input id="name" name="name" required className={inputClass} placeholder="e.g. Truck" />
          </Field>
          <Field label="Category" htmlFor="category">
            <input
              id="category"
              name="category"
              required
              className={inputClass}
              placeholder="e.g. Vehicle Payment"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Amount (leave blank if variable)" htmlFor="amount">
            <input id="amount" name="amount" type="number" step="0.01" min="0" className={inputClass} />
          </Field>
          <Field label="Frequency" htmlFor="frequency">
            <select id="frequency" name="frequency" defaultValue="monthly" className={inputClass}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </Field>
          <Field label="Payment Method (optional)" htmlFor="paymentMethod">
            <input
              id="paymentMethod"
              name="paymentMethod"
              className={inputClass}
              placeholder="e.g. Auto (MOBI Checking)"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Due Day of Month (for monthly bills)" htmlFor="dueDay">
            <input id="dueDay" name="dueDay" type="number" min="1" max="31" className={inputClass} />
          </Field>
          <Field label="Due Date (for yearly bills)" htmlFor="dueDate">
            <input id="dueDate" name="dueDate" type="date" className={inputClass} />
          </Field>
        </div>

        <Field label="Notes (optional)" htmlFor="notes">
          <input id="notes" name="notes" className={inputClass} />
        </Field>

        <div>
          <button
            type="submit"
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Add Bill
          </button>
        </div>
      </form>
    </div>
  );
}
