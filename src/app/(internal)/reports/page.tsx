import { db } from "@/lib/db";
import { DonutChart } from "@/components/DonutChart";

export const dynamic = "force-dynamic";

const EXPENSE_COLORS = [
  "#16a34a",
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
  "#ec4899",
  "#6b7280",
  "#eab308",
  "#0ea5e9",
];

function startOfDayUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfWeekUTC(date: Date) {
  const start = startOfDayUTC(date);
  const daysSinceMonday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start;
}

function startOfMonthUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfYearUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function SummaryCard({
  label,
  value,
  highlight,
  sub,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  sub?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="truncate text-sm text-zinc-500">{label}</div>
      <div
        className={`mt-1 break-words text-xl font-semibold sm:text-2xl ${
          highlight ? (value >= 0 ? "text-green-700" : "text-red-600") : "text-zinc-900"
        }`}
      >
        ${value.toFixed(2)}
      </div>
      {sub && <div className="mt-1 text-xs text-zinc-400">{sub}</div>}
    </div>
  );
}

export default async function ReportsPage() {
  const [invoices, expenses] = await Promise.all([
    db.invoice.findMany({
      include: { booking: { include: { customer: true } }, customer: true },
    }),
    db.expense.findMany({ include: { equipmentItem: true } }),
  ]);

  const totalRevenue = invoices.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = totalRevenue - totalExpenses;

  const outstandingReceivables = invoices
    .filter((i) => i.status !== "paid")
    .reduce((sum, i) => sum + i.amount, 0);
  const outstandingPayables = expenses
    .filter((e) => e.status !== "paid")
    .reduce((sum, e) => sum + e.amount, 0);

  const monthly = new Map<string, { revenue: number; expenses: number }>();
  for (const invoice of invoices) {
    const key = monthKey(invoice.issueDate);
    const entry = monthly.get(key) ?? { revenue: 0, expenses: 0 };
    entry.revenue += invoice.amount;
    monthly.set(key, entry);
  }
  for (const expense of expenses) {
    const key = monthKey(expense.date);
    const entry = monthly.get(key) ?? { revenue: 0, expenses: 0 };
    entry.expenses += expense.amount;
    monthly.set(key, entry);
  }
  const months = Array.from(monthly.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 12);

  const byCustomer = new Map<string, { name: string; revenue: number }>();
  for (const invoice of invoices) {
    const customer = invoice.booking?.customer ?? invoice.customer;
    if (!customer) continue;
    const entry = byCustomer.get(customer.id) ?? { name: customer.name, revenue: 0 };
    entry.revenue += invoice.amount;
    byCustomer.set(customer.id, entry);
  }
  const customerRows = Array.from(byCustomer.entries()).sort(
    (a, b) => b[1].revenue - a[1].revenue
  );

  const byEquipment = new Map<string, { label: string; cost: number }>();
  for (const expense of expenses) {
    if (!expense.equipmentItem) continue;
    const entry = byEquipment.get(expense.equipmentItem.id) ?? {
      label: expense.equipmentItem.label,
      cost: 0,
    };
    entry.cost += expense.amount;
    byEquipment.set(expense.equipmentItem.id, entry);
  }
  const equipmentRows = Array.from(byEquipment.entries()).sort(
    (a, b) => b[1].cost - a[1].cost
  );

  const now = new Date();
  const sumSince = (start: Date) =>
    invoices
      .filter((i) => i.issueDate >= start)
      .reduce((sum, i) => sum + i.amount, 0);
  const revenueToday = sumSince(startOfDayUTC(now));
  const revenueThisWeek = sumSince(startOfWeekUTC(now));
  const revenueThisMonth = sumSince(startOfMonthUTC(now));
  const revenueThisYear = sumSince(startOfYearUTC(now));

  const byCategory = new Map<string, number>();
  for (const expense of expenses) {
    byCategory.set(
      expense.category,
      (byCategory.get(expense.category) ?? 0) + expense.amount
    );
  }
  const expenseSlices = Array.from(byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({
      label,
      value,
      color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
    }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">Reports</h1>
        <p className="mt-1 text-zinc-500">
          Revenue and expenses across all time, based on invoiced and incurred
          amounts (not just what&apos;s been collected or paid).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard label="Total Revenue" value={totalRevenue} />
        <SummaryCard label="Total Expenses" value={totalExpenses} />
        <SummaryCard label="Net Profit" value={profit} highlight />
        <SummaryCard
          label="Net Outstanding"
          value={outstandingReceivables - outstandingPayables}
          sub={`$${outstandingReceivables.toFixed(2)} unpaid invoices, $${outstandingPayables.toFixed(2)} unpaid bills`}
        />
      </div>

      <section>
        <h2 className="text-xl font-semibold text-ink">Revenue</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Based on invoice issue dates.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <SummaryCard label="Today" value={revenueToday} />
          <SummaryCard label="This Week" value={revenueThisWeek} />
          <SummaryCard label="This Month" value={revenueThisMonth} />
          <SummaryCard label="This Year" value={revenueThisYear} />
          <SummaryCard label="All Time (To Date)" value={totalRevenue} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-ink">
          Expense Breakdown
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Total expenses by category.
        </p>
        <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <DonutChart slices={expenseSlices} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-ink">
          Monthly Breakdown
        </h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Month</th>
                <th className="px-5 py-3.5 font-semibold">Revenue</th>
                <th className="px-5 py-3.5 font-semibold">Expenses</th>
                <th className="px-5 py-3.5 font-semibold">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {months.map(([key, data]) => (
                <tr key={key}>
                  <td className="px-5 py-4 font-medium text-zinc-900">
                    {monthLabel(key)}
                  </td>
                  <td className="px-5 py-4 text-zinc-600">
                    ${data.revenue.toFixed(2)}
                  </td>
                  <td className="px-5 py-4 text-zinc-600">
                    ${data.expenses.toFixed(2)}
                  </td>
                  <td
                    className={`px-5 py-4 font-medium ${
                      data.revenue - data.expenses >= 0
                        ? "text-green-700"
                        : "text-red-600"
                    }`}
                  >
                    ${(data.revenue - data.expenses).toFixed(2)}
                  </td>
                </tr>
              ))}
              {months.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
                    No data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-ink">
          Revenue by Customer
        </h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Customer</th>
                <th className="px-5 py-3.5 font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {customerRows.map(([customerId, row]) => (
                <tr key={customerId}>
                  <td className="px-5 py-4 text-zinc-900">{row.name}</td>
                  <td className="px-5 py-4 text-zinc-600">
                    ${row.revenue.toFixed(2)}
                  </td>
                </tr>
              ))}
              {customerRows.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-zinc-400">
                    No data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {equipmentRows.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-ink">
            Cost by Equipment
          </h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Equipment</th>
                  <th className="px-5 py-3.5 font-semibold">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {equipmentRows.map(([itemId, row]) => (
                  <tr key={itemId}>
                    <td className="px-5 py-4 text-zinc-900">{row.label}</td>
                    <td className="px-5 py-4 text-zinc-600">
                      ${row.cost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
