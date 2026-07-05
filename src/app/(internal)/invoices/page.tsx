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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Invoices</h1>
        <Link
          href="/invoices/unpaid"
          className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Who Owes Me Money
        </Link>
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
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
