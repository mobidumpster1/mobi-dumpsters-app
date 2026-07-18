import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getOrgBranding } from "@/lib/orgBranding";
import { formatDate } from "@/lib/date";
import { branding as staticBranding } from "@/lib/branding";
import { QUOTE_STATUS_LABELS } from "@/lib/quoteStatus";
import { QuoteAcceptDecline } from "./QuoteAcceptDecline";

export const dynamic = "force-dynamic";

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const quote = await db.quote.findUnique({
    where: { publicToken: token },
    include: { lead: true, customer: true, lineItems: { orderBy: { createdAt: "asc" } } },
  });
  if (!quote) notFound();

  const forWhom = quote.customer ?? quote.lead;
  const branding = await getOrgBranding(quote.organizationId);

  return (
    <div className="theme-light min-h-screen bg-brand-light px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink">{branding.businessName}</h1>
          <p className="mt-1 text-zinc-600">Quote {quote.quoteNumber}</p>
        </div>

        <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">
              {forWhom ? `Hi ${forWhom.name}` : "Your Quote"}
            </h2>
            <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
              {QUOTE_STATUS_LABELS[quote.status] ?? quote.status}
            </span>
          </div>
          {quote.proposedDate && (
            <p className="mt-2 text-sm text-zinc-500">
              Proposed date: {formatDate(quote.proposedDate)}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {quote.lineItems.map((line) => (
              <div
                key={line.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-ink">
                    {line.description}
                    {line.optional && (
                      <span className="ml-2 rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand">
                        Optional
                      </span>
                    )}
                  </p>
                  {line.quantity !== 1 && (
                    <p className="text-zinc-500">Qty {line.quantity}</p>
                  )}
                </div>
                <p className="font-semibold text-ink">${line.amount.toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
            <p className="text-sm font-medium text-zinc-500">
              {quote.lineItems.some((l) => l.optional) ? "Full Price (with all add-ons)" : "Total"}
            </p>
            <p className="text-base font-bold text-ink">${quote.amount.toFixed(2)}</p>
          </div>

          {quote.acceptedAmount != null && (
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-500">Accepted Total</p>
              <p className="text-base font-bold text-brand">${quote.acceptedAmount.toFixed(2)}</p>
            </div>
          )}

          {quote.notes && (
            <p className="mt-4 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">{quote.notes}</p>
          )}
        </div>

        <QuoteAcceptDecline
          publicToken={quote.publicToken}
          status={quote.status}
          lineItems={quote.lineItems.map((l) => ({
            id: l.id,
            description: l.description,
            amount: l.amount,
            quantity: l.quantity,
            optional: l.optional,
          }))}
        />

        <p className="mt-6 text-center text-xs text-zinc-400">
          Questions? Call or text us at {staticBranding.smsPhone}.
        </p>
      </div>
    </div>
  );
}
