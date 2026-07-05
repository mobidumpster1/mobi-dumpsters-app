import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const expenses = await db.expense.findMany({
    orderBy: { date: "desc" },
    include: { equipmentItem: true, booking: { include: { customer: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Expenses</h1>
        <div className="flex gap-3">
          <Link
            href="/expenses/scan"
            className="rounded-xl border border-brand px-5 py-3 text-sm font-semibold text-brand transition-colors hover:bg-brand/5"
          >
            📷 Scan Receipt
          </Link>
          <Link
            href="/expenses/new"
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            + New Expense
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Date</th>
              <th className="px-5 py-3.5 font-semibold">Vendor</th>
              <th className="px-5 py-3.5 font-semibold">Category</th>
              <th className="px-5 py-3.5 font-semibold">Linked To</th>
              <th className="px-5 py-3.5 font-semibold">Amount</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {expenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-zinc-50">
                <td className="px-5 py-4 text-zinc-600">
                  {formatDate(expense.date)}
                </td>
                <td className="px-5 py-4">
                  <Link
                    href={`/expenses/${expense.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {expense.vendor}
                  </Link>
                </td>
                <td className="px-5 py-4 text-zinc-600">{expense.category}</td>
                <td className="px-5 py-4 text-zinc-600">
                  {expense.booking
                    ? `Job: ${expense.booking.customer.name}`
                    : expense.equipmentItem
                      ? expense.equipmentItem.label
                      : "—"}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  ${expense.amount.toFixed(2)}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      expense.status === "paid"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {expense.status}
                  </span>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  No expenses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
