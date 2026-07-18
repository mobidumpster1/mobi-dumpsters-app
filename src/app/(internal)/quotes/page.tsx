import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_STYLES } from "@/lib/quoteStatus";
import { hasPlan, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const user = await requireUser();
  if (!hasPlan(user, "team")) redirect("/");
  const quotes = await db.quote.findMany({
    where: { organizationId: user.effectiveOrganizationId },
    orderBy: { createdAt: "desc" },
    include: { lead: true, customer: true },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black tracking-tight text-ink">Quotes</h1>
        <Link
          href="/quotes/new"
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          + New Quote
        </Link>
      </div>

      {/* Mobile: card list */}
      <div className="mt-6 flex flex-col gap-3 md:hidden">
        {quotes.map((quote) => {
          const forWhom = quote.customer?.name ?? quote.lead?.name ?? "—";
          return (
            <Link
              key={quote.id}
              href={`/quotes/${quote.id}`}
              className="block rounded-lg border-2 border-zinc-900 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-zinc-900">{quote.quoteNumber}</span>
                <span
                  className={`inline-block flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-black capitalize ${
                    QUOTE_STATUS_STYLES[quote.status] ?? "bg-zinc-500 text-white"
                  }`}
                >
                  {QUOTE_STATUS_LABELS[quote.status] ?? quote.status}
                </span>
              </div>
              <dl className="mt-2 flex flex-col gap-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">For</dt>
                  <dd className="truncate text-zinc-700">{forWhom}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Created</dt>
                  <dd className="text-zinc-700">{formatDate(quote.createdAt)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Amount</dt>
                  <dd className="font-medium text-zinc-900">${quote.amount.toFixed(2)}</dd>
                </div>
              </dl>
            </Link>
          );
        })}
        {quotes.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            No quotes yet.
          </p>
        )}
      </div>

      {/* Tablet/desktop: table */}
      <div className="mt-6 hidden overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Quote #</th>
              <th className="px-5 py-3.5 font-semibold">For</th>
              <th className="px-5 py-3.5 font-semibold">Created</th>
              <th className="px-5 py-3.5 font-semibold">Amount</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {quotes.map((quote) => {
              const forWhom = quote.customer?.name ?? quote.lead?.name ?? "—";
              return (
                <tr key={quote.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-4">
                    <Link
                      href={`/quotes/${quote.id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {quote.quoteNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-zinc-600">{forWhom}</td>
                  <td className="px-5 py-4 text-zinc-600">{formatDate(quote.createdAt)}</td>
                  <td className="px-5 py-4 text-zinc-600">${quote.amount.toFixed(2)}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-black capitalize ${
                        QUOTE_STATUS_STYLES[quote.status] ?? "bg-zinc-500 text-white"
                      }`}
                    >
                      {QUOTE_STATUS_LABELS[quote.status] ?? quote.status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {quotes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  No quotes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
