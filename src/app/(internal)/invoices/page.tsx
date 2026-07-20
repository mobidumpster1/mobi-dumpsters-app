import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { computeDisplayStatus, INVOICE_STATUS_STYLES } from "@/lib/invoiceStatus";
import { SearchBox } from "@/components/SearchBox";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = ["unpaid", "partial", "overdue", "paid"] as const;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const user = await requireUser();
  const { status, q } = await searchParams;

  function statusHref(nextStatus?: string) {
    const params = new URLSearchParams();
    if (nextStatus) params.set("status", nextStatus);
    if (q) params.set("q", q);
    const qs = params.toString();
    return `/invoices${qs ? `?${qs}` : ""}`;
  }

  const allInvoices = await db.invoice.findMany({
    where: { organizationId: user.effectiveOrganizationId },
    orderBy: { issueDate: "desc" },
    include: { booking: { include: { customer: true } }, customer: true },
  });

  const withStatus = allInvoices.map((invoice) => ({
    ...invoice,
    displayStatus: computeDisplayStatus(invoice.status, invoice.dueDate),
    customerName: (invoice.booking?.customer ?? invoice.customer)?.name ?? "—",
  }));

  const countByStatus = new Map<string, number>();
  for (const invoice of withStatus) {
    countByStatus.set(invoice.displayStatus, (countByStatus.get(invoice.displayStatus) ?? 0) + 1);
  }

  const search = q?.trim().toLowerCase();
  const invoices = withStatus.filter((invoice) => {
    if (status && invoice.displayStatus !== status) return false;
    if (search) {
      const haystack = `${invoice.invoiceNumber} ${invoice.customerName}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black tracking-tight text-ink">Invoices</h1>
        <Link
          href="/invoices/unpaid"
          className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Who Owes Me Money
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={statusHref()}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            !status ? "bg-brand text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          All ({withStatus.length})
        </Link>
        {STATUS_FILTERS.map((value) => (
          <Link
            key={value}
            href={statusHref(value)}
            className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
              status === value ? "bg-brand text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {value} ({countByStatus.get(value) ?? 0})
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <SearchBox placeholder="Search invoices by number or customer…" />
      </div>

      {/* Mobile: card list */}
      <div className="mt-6 flex flex-col gap-3 md:hidden">
        {invoices.map((invoice) => (
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
                className={`inline-block flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-black capitalize ${
                  INVOICE_STATUS_STYLES[invoice.displayStatus] ?? "bg-zinc-500 text-white"
                }`}
              >
                {invoice.displayStatus}
              </span>
            </div>
            <dl className="mt-2 flex flex-col gap-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Customer</dt>
                <dd className="truncate text-zinc-700">{invoice.customerName}</dd>
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
        ))}
        {invoices.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            {allInvoices.length === 0 ? "No invoices yet." : "No invoices match your search/filter."}
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
              <th className="px-5 py-3.5 font-semibold">Amount</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-zinc-50">
                <td className="px-5 py-4">
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {invoice.invoiceNumber}
                  </Link>
                </td>
                <td className="px-5 py-4 text-zinc-600">{invoice.customerName}</td>
                <td className="px-5 py-4 text-zinc-600">
                  {formatDate(invoice.issueDate)}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  ${invoice.amount.toFixed(2)}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-black capitalize ${
                      INVOICE_STATUS_STYLES[invoice.displayStatus] ?? "bg-zinc-500 text-white"
                    }`}
                  >
                    {invoice.displayStatus}
                  </span>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  {allInvoices.length === 0 ? "No invoices yet." : "No invoices match your search/filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
