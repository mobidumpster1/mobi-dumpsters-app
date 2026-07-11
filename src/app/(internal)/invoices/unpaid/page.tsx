import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { computeDisplayStatus, INVOICE_STATUS_STYLES } from "@/lib/invoiceStatus";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const MS_PER_DAY = 86_400_000;

export default async function UnpaidInvoicesPage() {
  const user = await requireUser();
  const invoices = await db.invoice.findMany({
    where: { status: { not: "paid" }, organizationId: user.effectiveOrganizationId },
    orderBy: { issueDate: "asc" },
    include: { booking: { include: { customer: true } }, customer: true },
  });

  const totalOwed = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">
            Who Owes Me Money
          </h1>
          <p className="mt-1 text-zinc-500">
            Unpaid invoices, oldest first. Total outstanding: $
            {totalOwed.toFixed(2)}
          </p>
        </div>
        <Link
          href="/invoices"
          className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          All Invoices
        </Link>
      </div>

      {/* Mobile: card list */}
      <div className="mt-6 flex flex-col gap-3 md:hidden">
        {invoices.map((invoice) => {
          const displayStatus = computeDisplayStatus(invoice.status, invoice.dueDate);
          const daysOutstanding = Math.floor(
            (new Date().getTime() - invoice.issueDate.getTime()) / MS_PER_DAY
          );
          const customer = invoice.booking?.customer ?? invoice.customer;
          return (
            <Link
              key={invoice.id}
              href={`/invoices/${invoice.id}`}
              className="block rounded-lg border-2 border-zinc-900 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-zinc-900">
                  {invoice.invoiceNumber}
                </span>
                <span
                  className={`inline-block flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    INVOICE_STATUS_STYLES[displayStatus] ?? "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {displayStatus}
                </span>
              </div>
              <dl className="mt-2 flex flex-col gap-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Customer</dt>
                  <dd className="truncate text-zinc-700">{customer?.name ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Issue Date</dt>
                  <dd className="text-zinc-700">{formatDate(invoice.issueDate)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Days Outstanding</dt>
                  <dd className="text-zinc-700">{daysOutstanding}d</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Amount</dt>
                  <dd className="font-medium text-zinc-900">
                    ${invoice.amount.toFixed(2)}
                  </dd>
                </div>
              </dl>
            </Link>
          );
        })}
        {invoices.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            Nothing outstanding — everyone&apos;s paid up.
          </p>
        )}
      </div>

      {/* Tablet/desktop: table */}
      <div className="mt-6 hidden overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Invoice #</th>
              <th className="px-5 py-3.5 font-semibold">Customer</th>
              <th className="px-5 py-3.5 font-semibold">Issue Date</th>
              <th className="px-5 py-3.5 font-semibold">Days Outstanding</th>
              <th className="px-5 py-3.5 font-semibold">Amount</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {invoices.map((invoice) => {
              const displayStatus = computeDisplayStatus(
                invoice.status,
                invoice.dueDate
              );
              const daysOutstanding = Math.floor(
                (new Date().getTime() - invoice.issueDate.getTime()) / MS_PER_DAY
              );
              const customer = invoice.booking?.customer ?? invoice.customer;
              return (
                <tr key={invoice.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-4">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    {customer ? (
                      <Link
                        href={`/customers/${customer.id}`}
                        className="text-zinc-600 hover:underline"
                      >
                        {customer.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-4 text-zinc-600">
                    {formatDate(invoice.issueDate)}
                  </td>
                  <td className="px-5 py-4 text-zinc-600">
                    {daysOutstanding}d
                  </td>
                  <td className="px-5 py-4 font-medium text-zinc-900">
                    ${invoice.amount.toFixed(2)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        INVOICE_STATUS_STYLES[displayStatus] ?? "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {displayStatus}
                    </span>
                  </td>
                </tr>
              );
            })}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  Nothing outstanding — everyone&apos;s paid up.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
