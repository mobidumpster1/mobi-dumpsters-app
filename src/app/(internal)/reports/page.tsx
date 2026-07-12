import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DonutChart } from "@/components/DonutChart";
import { hasPermission, requireUser } from "@/lib/session";
import { LEAD_SOURCE_LABELS } from "@/lib/leadSource";

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
    <div className="min-w-0 rounded-lg border-2 border-zinc-900 bg-white p-5">
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
  const user = await requireUser();
  if (!hasPermission(user, "canViewReports")) redirect("/");

  const [invoices, expenses, recurringBills] = await Promise.all([
    db.invoice.findMany({
      where: { organizationId: user.effectiveOrganizationId },
      include: { booking: { include: { customer: true } }, customer: true },
    }),
    db.expense.findMany({
      where: { organizationId: user.effectiveOrganizationId },
      include: { equipmentItem: true },
    }),
    db.recurringBill.findMany({
      where: { organizationId: user.effectiveOrganizationId, active: true },
      orderBy: { name: "asc" },
    }),
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

  const byCustomer = new Map<string, { name: string; revenue: number; invoiceCount: number }>();
  for (const invoice of invoices) {
    const customer = invoice.booking?.customer ?? invoice.customer;
    if (!customer) continue;
    const entry = byCustomer.get(customer.id) ?? { name: customer.name, revenue: 0, invoiceCount: 0 };
    entry.revenue += invoice.amount;
    entry.invoiceCount += 1;
    byCustomer.set(customer.id, entry);
  }
  const customerRows = Array.from(byCustomer.entries()).sort(
    (a, b) => b[1].revenue - a[1].revenue
  );

  // A customer is "returning" here if they've been invoiced more than
  // once — a simple, self-maintaining stand-in for "have they booked
  // with us before," computed fresh each time rather than a field that
  // could get out of sync.
  let newCustomerRevenue = 0;
  let returningCustomerRevenue = 0;
  let newCustomerCount = 0;
  let returningCustomerCount = 0;
  for (const [, row] of byCustomer) {
    if (row.invoiceCount > 1) {
      returningCustomerRevenue += row.revenue;
      returningCustomerCount += 1;
    } else {
      newCustomerRevenue += row.revenue;
      newCustomerCount += 1;
    }
  }

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

  const byChannel = new Map<string, { revenue: number; bookings: number }>();
  for (const invoice of invoices) {
    const customer = invoice.booking?.customer ?? invoice.customer;
    const source = customer?.leadSource ?? "not_specified";
    const entry = byChannel.get(source) ?? { revenue: 0, bookings: 0 };
    entry.revenue += invoice.amount;
    entry.bookings += 1;
    byChannel.set(source, entry);
  }
  const channelRows = Array.from(byChannel.entries()).sort(
    (a, b) => b[1].revenue - a[1].revenue
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
  const categoryRows = expenseSlices.map((s) => ({
    ...s,
    percent: totalExpenses > 0 ? (s.value / totalExpenses) * 100 : 0,
  }));

  const byVendor = new Map<string, { amount: number; count: number }>();
  for (const expense of expenses) {
    const entry = byVendor.get(expense.vendor) ?? { amount: 0, count: 0 };
    entry.amount += expense.amount;
    entry.count += 1;
    byVendor.set(expense.vendor, entry);
  }
  const vendorRows = Array.from(byVendor.entries())
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([vendor, row]) => ({
      vendor,
      ...row,
      percent: totalExpenses > 0 ? (row.amount / totalExpenses) * 100 : 0,
    }));

  // Recurring bills aren't actual incurred expenses until logged as one
  // (see "Log as Expense" on /expenses/recurring) — kept as a separate
  // "scheduled commitments" figure rather than folded into Total Expenses
  // above, so this doesn't silently double-count once a bill does get
  // logged that period.
  const recurringMonthlyTotal = recurringBills
    .filter((b) => b.frequency === "monthly" && b.amount != null)
    .reduce((sum, b) => sum + (b.amount ?? 0), 0);
  const recurringYearlyTotal = recurringBills
    .filter((b) => b.frequency === "yearly" && b.amount != null)
    .reduce((sum, b) => sum + (b.amount ?? 0), 0);
  const recurringMonthlyEquivalent = recurringMonthlyTotal + recurringYearlyTotal / 12;
  const recurringVariableCount = recurringBills.filter((b) => b.amount == null).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-ink">Reports</h1>
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
        <h2 className="text-xl font-black text-ink">Revenue</h2>
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
        <h2 className="text-xl font-black text-ink">
          Expense Breakdown
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Total expenses by category and by vendor.
        </p>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border-2 border-zinc-900 bg-white p-5">
            <DonutChart slices={expenseSlices} />
          </div>
          <div className="overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Category</th>
                  <th className="px-5 py-3.5 font-semibold">Amount</th>
                  <th className="px-5 py-3.5 font-semibold">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {categoryRows.map((row) => (
                  <tr key={row.label}>
                    <td className="px-5 py-4 text-zinc-900">{row.label}</td>
                    <td className="px-5 py-4 text-zinc-600">${row.value.toFixed(2)}</td>
                    <td className="px-5 py-4 text-zinc-600">{row.percent.toFixed(1)}%</td>
                  </tr>
                ))}
                {categoryRows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-zinc-400">
                      No data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Vendor</th>
                <th className="px-5 py-3.5 font-semibold"># Expenses</th>
                <th className="px-5 py-3.5 font-semibold">Amount</th>
                <th className="px-5 py-3.5 font-semibold">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {vendorRows.map((row) => (
                <tr key={row.vendor}>
                  <td className="px-5 py-4 text-zinc-900">{row.vendor}</td>
                  <td className="px-5 py-4 text-zinc-600">{row.count}</td>
                  <td className="px-5 py-4 text-zinc-600">${row.amount.toFixed(2)}</td>
                  <td className="px-5 py-4 text-zinc-600">{row.percent.toFixed(1)}%</td>
                </tr>
              ))}
              {vendorRows.length === 0 && (
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
        <h2 className="text-xl font-black text-ink">Recurring Bills</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Scheduled commitments from{" "}
          <Link href="/expenses/recurring" className="font-semibold text-brand hover:underline">
            Recurring Bills
          </Link>{" "}
          — not counted in Total Expenses above until actually logged that period, so this
          won&apos;t double-count once one is.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3">
          <SummaryCard label="Monthly Total" value={recurringMonthlyTotal} />
          <SummaryCard label="Yearly Total" value={recurringYearlyTotal} />
          <SummaryCard
            label="Effective Monthly Overhead"
            value={recurringMonthlyEquivalent}
            sub={
              recurringVariableCount > 0
                ? `Plus ${recurringVariableCount} variable-amount bill${recurringVariableCount === 1 ? "" : "s"} not included`
                : undefined
            }
          />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-ink">
          Monthly Breakdown
        </h2>
        <div className="mt-3 overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white">
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
        <h2 className="text-xl font-black text-ink">
          Revenue by Customer
        </h2>
        <div className="mt-3 overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white">
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

      <section>
        <h2 className="text-xl font-black text-ink">New vs. Returning Customers</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Returning means invoiced more than once, ever — not limited to a
          specific time period.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <SummaryCard
            label={`New Customers (${newCustomerCount})`}
            value={newCustomerRevenue}
          />
          <SummaryCard
            label={`Returning Customers (${returningCustomerCount})`}
            value={returningCustomerRevenue}
          />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-ink">Channel Performance</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Revenue grouped by how each customer found you — set per customer
          on their profile, or automatically when converted from a Lead.
        </p>
        <div className="mt-3 overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Source</th>
                <th className="px-5 py-3.5 font-semibold">Invoices</th>
                <th className="px-5 py-3.5 font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {channelRows.map(([source, row]) => (
                <tr key={source}>
                  <td className="px-5 py-4 text-zinc-900">
                    {source === "not_specified" ? "Not Specified" : LEAD_SOURCE_LABELS[source] ?? source}
                  </td>
                  <td className="px-5 py-4 text-zinc-600">{row.bookings}</td>
                  <td className="px-5 py-4 text-zinc-600">${row.revenue.toFixed(2)}</td>
                </tr>
              ))}
              {channelRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-zinc-400">
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
          <h2 className="text-xl font-black text-ink">
            Cost by Equipment
          </h2>
          <div className="mt-3 overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white">
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
