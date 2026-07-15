import Link from "next/link";
import { db } from "@/lib/db";
import { getOrgBranding } from "@/lib/orgBranding";
import { getPublicOrganizationId } from "@/lib/session";
import { getValidConnection } from "@/lib/quickbooks";
import { payBookingInvoiceNow } from "../actions";

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; agreement?: string; invoice?: string; payError?: string }>;
}) {
  const { ref, agreement, invoice: invoiceId, payError } = await searchParams;
  const organizationId = await getPublicOrganizationId();
  const branding = await getOrgBranding(organizationId);

  const [invoice, connection] = await Promise.all([
    invoiceId ? db.invoice.findUnique({ where: { id: invoiceId } }) : null,
    getValidConnection(organizationId),
  ]);

  // Already paid (e.g. they hit back after paying, or clicked twice).
  const canPayNow = invoice && connection && invoice.status !== "paid";
  const payNowWithId = invoice ? payBookingInvoiceNow.bind(null, invoice.id) : null;

  return (
    <div className="theme-public-dark flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-ink">Request received!</h1>
        <p className="mt-3 text-zinc-600">
          Thanks for your request. {branding.businessName} will contact you
          shortly to confirm details.
        </p>
        {ref && <p className="mt-4 text-sm text-zinc-400">Reference #: {ref}</p>}

        {invoice && (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-left">
            <p className="text-sm font-semibold text-ink">
              Total: ${invoice.amount.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Pay online now, or pay when the job is done — whichever&apos;s
              easier. No action needed here if you&apos;d rather pay later.
            </p>

            {payError === "1" && (
              <p className="mt-3 text-xs font-medium text-red-600">
                Online payment isn&apos;t available right now — no worries,
                you can pay when the job&apos;s done instead.
              </p>
            )}

            {canPayNow && payNowWithId && (
              <form action={payNowWithId} className="mt-4">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
                >
                  Pay ${invoice.amount.toFixed(2)} Now via QuickBooks
                </button>
              </form>
            )}
          </div>
        )}

        {agreement && (
          <Link
            href={`/agreement/view/${agreement}`}
            className="mt-6 inline-block rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            View Your Order &amp; Signed Agreement
          </Link>
        )}
      </div>
    </div>
  );
}
