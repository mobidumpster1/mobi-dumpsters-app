import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { deleteQuote, expireQuote } from "../actions";
import { uploadQuotePhoto, deleteQuotePhoto } from "../photoActions";
import { SendQuoteButton } from "../SendQuoteButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CopyTextButton } from "@/components/CopyTextButton";
import { MediaUploadForm } from "@/components/MediaUploadForm";
import { MediaGrid } from "@/components/MediaGrid";
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_STYLES } from "@/lib/quoteStatus";
import { siteOrigin } from "@/lib/email";
import { hasPlan, requireUser } from "@/lib/session";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!hasPlan(user, "team")) redirect("/");
  const quote = await db.quote.findFirst({
    where: { id, organizationId: user.effectiveOrganizationId },
    include: {
      lead: true,
      customer: true,
      lineItems: { orderBy: { createdAt: "asc" } },
      photos: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!quote) notFound();

  const expireQuoteWithId = expireQuote.bind(null, quote.id);
  const deleteQuoteWithId = deleteQuote.bind(null, quote.id);
  const forWhom = quote.customer ?? quote.lead;
  const publicLink = `${siteOrigin()}/quote/${quote.publicToken}`;

  return (
    <div className="max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">
            {quote.quoteNumber}
          </h1>
          <p className="mt-1 text-zinc-500">
            {forWhom &&
              (quote.customer ? (
                <Link href={`/customers/${quote.customer.id}`} className="hover:underline">
                  {forWhom.name}
                </Link>
              ) : (
                forWhom.name
              ))}
          </p>
          {quote.bookingId && (
            <Link
              href={`/bookings/${quote.bookingId}`}
              className="mt-1 inline-block text-sm text-brand hover:underline"
            >
              View Booking
            </Link>
          )}
        </div>
        <span
          className={`inline-block rounded-full px-3 py-1 text-sm font-black capitalize ${
            QUOTE_STATUS_STYLES[quote.status] ?? "bg-zinc-500 text-white"
          }`}
        >
          {QUOTE_STATUS_LABELS[quote.status] ?? quote.status}
        </span>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border-2 border-zinc-900 bg-white p-5 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-zinc-500">Created</dt>
          <dd className="text-zinc-900">{formatDate(quote.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Proposed Date</dt>
          <dd className="text-zinc-900">
            {quote.proposedDate ? formatDate(quote.proposedDate) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Amount</dt>
          <dd className="text-zinc-900">${quote.amount.toFixed(2)}</dd>
        </div>
        {quote.acceptedAmount != null && (
          <div>
            <dt className="text-zinc-500">Accepted Amount</dt>
            <dd className="font-semibold text-brand">${quote.acceptedAmount.toFixed(2)}</dd>
          </div>
        )}
        {quote.notes && (
          <div className="col-span-full">
            <dt className="text-zinc-500">Notes</dt>
            <dd className="text-zinc-900">{quote.notes}</dd>
          </div>
        )}
      </dl>

      <h2 className="mt-8 text-xl font-black text-ink">Line Items</h2>
      <div className="mt-3 overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Description</th>
              <th className="px-5 py-3.5 font-semibold">Qty</th>
              <th className="px-5 py-3.5 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {quote.lineItems.map((line) => (
              <tr key={line.id}>
                <td className="px-5 py-4 font-medium text-zinc-900">
                  {line.description}
                  {line.optional && (
                    <span className="ml-2 rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand">
                      Optional
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-zinc-600">{line.quantity}</td>
                <td className="px-5 py-4 text-zinc-600">${line.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="px-5 py-4 text-right font-medium text-zinc-500">
                Total
              </td>
              <td className="px-5 py-4 font-medium text-zinc-900">
                ${quote.amount.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-6 rounded-lg border-2 border-zinc-900 bg-white p-5">
        <h2 className="text-lg font-semibold text-ink">Attachments</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Reference photos, site plans, or anything else worth keeping with this quote.
        </p>
        <MediaUploadForm
          uploadAction={uploadQuotePhoto.bind(null, quote.id)}
          typeOptions={[{ value: "other", label: "File" }]}
          defaultType="other"
          folder={`quotes/${quote.id}`}
        />
        <MediaGrid items={quote.photos} deleteAction={deleteQuotePhoto} />
      </div>

      {quote.status === "draft" && (
        <div className="mt-6 rounded-lg border-2 border-zinc-900 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink">Send</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Emails and/or texts a link where {forWhom?.name ?? "they"} can view and accept
            or decline this quote.
          </p>
          <div className="mt-3">
            <SendQuoteButton quoteId={quote.id} />
          </div>
        </div>
      )}

      {quote.status !== "draft" && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border-2 border-zinc-900 bg-white p-5">
          <p className="text-sm text-zinc-500">Public link</p>
          <CopyTextButton
            text={publicLink}
            label="Copy Link"
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          />
          {quote.status === "sent" && (
            <form action={expireQuoteWithId}>
              <button
                type="submit"
                className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Mark Expired
              </button>
            </form>
          )}
        </div>
      )}

      {quote.status === "draft" && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <div />
          <form action={deleteQuoteWithId}>
            <ConfirmButton
              message={`Delete quote ${quote.quoteNumber}? This can't be undone.`}
              className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              Delete Quote
            </ConfirmButton>
          </form>
        </div>
      )}
    </div>
  );
}
