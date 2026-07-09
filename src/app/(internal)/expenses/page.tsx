import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { hasPermission, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const user = await requireUser();
  if (!hasPermission(user, "canManageExpenses")) redirect("/");

  const expenses = await db.expense.findMany({
    orderBy: { date: "desc" },
    include: { equipmentItem: true, booking: { include: { customer: true } } },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Expenses</h1>
        <div className="flex gap-3">
          <Link
            href="/expenses/recurring"
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            🔁 Recurring Bills
          </Link>
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

      {/* Mobile: card list */}
      <div className="mt-6 flex flex-col gap-3 md:hidden">
        {expenses.map((expense) => (
          <Link
            key={expense.id}
            href={`/expenses/${expense.id}`}
            className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-zinc-900">{expense.vendor}</span>
              <span
                className={`inline-block flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                  expense.status === "paid"
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {expense.status}
              </span>
            </div>
            <dl className="mt-2 flex flex-col gap-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Date</dt>
                <dd className="text-zinc-700">{formatDate(expense.date)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Category</dt>
                <dd className="text-zinc-700">{expense.category}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Linked To</dt>
                <dd className="truncate text-zinc-700">
                  {expense.booking
                    ? `Job: ${expense.booking.customer.name}`
                    : expense.equipmentItem
                      ? expense.equipmentItem.label
                      : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Amount</dt>
                <dd className="font-medium text-zinc-900">
                  ${expense.amount.toFixed(2)}
                </dd>
              </div>
            </dl>
          </Link>
        ))}
        {expenses.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            No expenses yet.
          </p>
        )}
      </div>

      {/* Tablet/desktop: table */}
      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm md:block">
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
