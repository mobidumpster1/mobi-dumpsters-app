import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { computeDisplayStatus, INVOICE_STATUS_STYLES } from "@/lib/invoiceStatus";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const invoices = await db.invoice.findMany({
    orderBy: { issueDate: "desc" },
    include: { booking: { include: { customer: true } }, customer: true },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Invoices</h1>
        <Link
          href="/invoices/unpaid"
          className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Who Owes Me Money
        </Link>
      </div>
      {/* Mobile: card list */}
      <div className="mt-6 flex flex-col gap-3 md:hidden">
        {invoices.map((invoice) => {
          const displayStatus = computeDisplayStatus(invoice.status, invoice.dueDate);
          const customer = invoice.booking?.customer ?? invoice.customer;
          return (
            <Link
              key={invoice.id}
              href={`/invoices/${invoice.id}`}
              className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
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
            No invoices yet.
          </p>
        )}
      </div>

      {/* Tablet/desktop: table */}
      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Invoice #</th>
              <th className="px-5 py-3.5 font-semibold">Customer</th>
              <th className="px-5 py-3.5 font-semibold">Issue Date</th>
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
                  <td className="px-5 py-4 text-zinc-600">
                    {customer?.name ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-zinc-600">
                    {formatDate(invoice.issueDate)}
                  </td>
                  <td className="px-5 py-4 text-zinc-600">
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
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
