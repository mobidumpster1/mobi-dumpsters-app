import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_STYLES } from "@/lib/quoteStatus";
import { SearchBox } from "@/components/SearchBox";
import { SendQuoteButton } from "./SendQuoteButton";
import { hasPlan, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = Object.keys(QUOTE_STATUS_LABELS);

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const user = await requireUser();
  if (!hasPlan(user, "team")) redirect("/");
  const { status, q } = await searchParams;

  function statusHref(nextStatus?: string) {
    const params = new URLSearchParams();
    if (nextStatus) params.set("status", nextStatus);
    if (q) params.set("q", q);
    const qs = params.toString();
    return `/quotes${qs ? `?${qs}` : ""}`;
  }

  const allQuotes = await db.quote.findMany({
    where: { organizationId: user.effectiveOrganizationId },
    orderBy: { createdAt: "desc" },
    include: { lead: true, customer: true },
  });

  const withForWhom = allQuotes.map((quote) => ({
    ...quote,
    forWhom: quote.customer?.name ?? quote.lead?.name ?? "—",
  }));

  const countByStatus = new Map<string, number>();
  for (const quote of withForWhom) {
    countByStatus.set(quote.status, (countByStatus.get(quote.status) ?? 0) + 1);
  }

  const search = q?.trim().toLowerCase();
  const quotes = withForWhom.filter((quote) => {
    if (status && quote.status !== status) return false;
    if (search) {
      const haystack = `${quote.quoteNumber} ${quote.forWhom}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
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

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={statusHref()}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            !status ? "bg-brand text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          All ({withForWhom.length})
        </Link>
        {STATUS_FILTERS.map((value) => (
          <Link
            key={value}
            href={statusHref(value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              status === value ? "bg-brand text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {QUOTE_STATUS_LABELS[value]} ({countByStatus.get(value) ?? 0})
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <SearchBox placeholder="Search quotes by number or customer…" />
      </div>

      {/* Mobile: card list */}
      <div className="mt-6 flex flex-col gap-3 md:hidden">
        {quotes.map((quote) => (
          <div key={quote.id} className="rounded-lg border-2 border-zinc-900 bg-white p-4">
            <Link href={`/quotes/${quote.id}`} className="block">
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
                  <dd className="truncate text-zinc-700">{quote.forWhom}</dd>
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
            {quote.status === "draft" && (
              <div className="mt-3">
                <SendQuoteButton quoteId={quote.id} compact />
              </div>
            )}
          </div>
        ))}
        {quotes.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            {allQuotes.length === 0 ? "No quotes yet — create your first one above." : "No quotes match your search/filter."}
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
              <th className="px-5 py-3.5 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {quotes.map((quote) => (
              <tr key={quote.id} className="hover:bg-zinc-50">
                <td className="px-5 py-4">
                  <Link
                    href={`/quotes/${quote.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {quote.quoteNumber}
                  </Link>
                </td>
                <td className="px-5 py-4 text-zinc-600">{quote.forWhom}</td>
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
                <td className="px-5 py-4">
                  {quote.status === "draft" && <SendQuoteButton quoteId={quote.id} compact />}
                </td>
              </tr>
            ))}
            {quotes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  {allQuotes.length === 0 ? "No quotes yet — create your first one above." : "No quotes match your search/filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
