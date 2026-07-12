import Link from "next/link";
import { notFound } from "next/navigation";
import { existsSync } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import {
  markPaid,
  markUnpaid,
  deleteInvoice,
  sendInvoiceForOnlinePayment,
  checkOnlinePaymentStatus,
} from "../actions";
import { isQuickBooksConfigured, getValidConnection, getQboInvoiceBalance } from "@/lib/quickbooks";
import { Field, inputClass } from "@/components/Field";
import { PrintButton } from "@/components/PrintButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { branding } from "@/lib/branding";
import { computeDisplayStatus, INVOICE_STATUS_STYLES } from "@/lib/invoiceStatus";
import { requireUser } from "@/lib/session";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  let invoice = await db.invoice.findFirst({
    where: { id, organizationId: user.effectiveOrganizationId },
    include: {
      booking: { include: { customer: true } },
      customer: true,
      lineItems: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!invoice) notFound();

  // Best-effort: if this invoice was sent for online payment and is still
  // unpaid, quietly check QuickBooks in case the customer already paid,
  // so staff see it as paid without having to click "Check Payment Status".
  if (invoice.status !== "paid" && invoice.onlinePaymentUrl && invoice.quickbooksInvoiceId) {
    try {
      const balance = await getQboInvoiceBalance(invoice.quickbooksInvoiceId, user.effectiveOrganizationId);
      if (balance === 0) {
        invoice = await db.invoice.update({
          where: { id: invoice.id },
          data: { status: "paid", paidDate: new Date(), paymentMethod: "QuickBooks Payments (online)" },
          include: {
            booking: { include: { customer: true } },
            customer: true,
            lineItems: { orderBy: { createdAt: "asc" } },
          },
        });
      }
    } catch (error) {
      console.error("Failed to auto-check QuickBooks payment status:", error);
    }
  }

  const markPaidWithId = markPaid.bind(null, invoice.id);
  const markUnpaidWithId = markUnpaid.bind(null, invoice.id);
  const deleteInvoiceWithId = deleteInvoice.bind(null, invoice.id);
  const sendForOnlinePaymentWithId = sendInvoiceForOnlinePayment.bind(null, invoice.id);
  const checkOnlinePaymentStatusWithId = checkOnlinePaymentStatus.bind(null, invoice.id);
  const displayStatus = computeDisplayStatus(invoice.status, invoice.dueDate);
  const customer = invoice.booking?.customer ?? invoice.customer;
  const quickbooksConnected = isQuickBooksConfigured()
    ? await getValidConnection(user.effectiveOrganizationId)
    : null;
  const logoExists = existsSync(
    path.join(process.cwd(), "public", branding.logoPath)
  );

  return (
    <div className="max-w-2xl">
      <Link
        href="/invoices"
        className="mb-2 inline-block text-sm font-semibold text-brand hover:underline print:hidden"
      >
        ← Back to Invoices
      </Link>
      <div className="mb-6 flex items-center justify-between rounded-lg border-2 border-zinc-900 bg-white p-5">
        <div className="flex items-center gap-3">
          {logoExists && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoPath}
              alt={branding.businessName}
              className="h-12 w-12 rounded-xl object-contain"
            />
          )}
          <div>
            <p className="font-semibold text-ink">{branding.businessName}</p>
            <p className="text-xs text-zinc-500">{branding.tagline}</p>
            <p className="text-xs text-zinc-500">
              {[branding.phone, branding.email, branding.address]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
        <PrintButton />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">
            {invoice.invoiceNumber}
          </h1>
          <p className="mt-1 text-zinc-500">
            {customer && (
              <Link
                href={`/customers/${customer.id}`}
                className="hover:underline"
              >
                {customer.name}
              </Link>
            )}
            {invoice.booking && (
              <>
                {customer && " · "}
                <Link
                  href={`/bookings/${invoice.booking.id}`}
                  className="hover:underline print:hidden"
                >
                  View Booking
                </Link>
              </>
            )}
          </p>
          {invoice.quickbooksInvoiceId && (
            <p className="mt-1 text-xs text-zinc-400">Synced to QuickBooks</p>
          )}
        </div>
        <span
          className={`inline-block rounded-full px-3 py-1 text-sm font-black capitalize ${
            INVOICE_STATUS_STYLES[displayStatus] ?? "bg-zinc-500 text-white"
          }`}
        >
          {displayStatus}
        </span>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border-2 border-zinc-900 bg-white p-5 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-zinc-500">Issue Date</dt>
          <dd className="text-zinc-900">{formatDate(invoice.issueDate)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Due Date</dt>
          <dd className="text-zinc-900">
            {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Amount</dt>
          <dd className="text-zinc-900">${invoice.amount.toFixed(2)}</dd>
        </div>
        {invoice.status === "paid" && (
          <>
            <div>
              <dt className="text-zinc-500">Paid Date</dt>
              <dd className="text-zinc-900">
                {invoice.paidDate ? formatDate(invoice.paidDate) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Payment Method</dt>
              <dd className="text-zinc-900">{invoice.paymentMethod ?? "—"}</dd>
            </div>
          </>
        )}
        {invoice.notes && (
          <div className="col-span-full">
            <dt className="text-zinc-500">Notes</dt>
            <dd className="text-zinc-900">{invoice.notes}</dd>
          </div>
        )}
      </dl>

      <h2 className="mt-8 text-xl font-black text-ink">Line Items</h2>
      <div className="mt-3 overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Description</th>
              <th className="px-5 py-3.5 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {invoice.lineItems.map((line) => (
              <tr key={line.id}>
                <td className="px-5 py-4 font-medium text-zinc-900">
                  {line.description}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  ${line.amount.toFixed(2)}
                </td>
              </tr>
            ))}
            {invoice.lineItems.length === 0 && (
              <tr>
                <td colSpan={2} className="px-5 py-4 text-zinc-500">
                  Total
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="px-5 py-4 text-right font-medium text-zinc-500">
                Total
              </td>
              <td className="px-5 py-4 font-medium text-zinc-900">
                ${invoice.amount.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {invoice.status !== "paid" && quickbooksConnected && customer && (
        <div className="mt-6 rounded-lg border-2 border-zinc-900 bg-white p-5 print:hidden">
          <h2 className="text-lg font-semibold text-ink">Online Payment</h2>
          {invoice.onlinePaymentUrl ? (
            <>
              <p className="mt-1 text-sm text-zinc-500">
                Sent {invoice.onlinePaymentSentAt ? formatDate(invoice.onlinePaymentSentAt) : ""}
                . The customer pays card or bank directly on QuickBooks&apos;
                hosted page — no card details ever touch this app.
              </p>
              <a
                href={invoice.onlinePaymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block break-all text-sm font-semibold text-brand hover:underline"
              >
                {invoice.onlinePaymentUrl}
              </a>
              <div className="mt-3 flex flex-wrap gap-3">
                <form action={checkOnlinePaymentStatusWithId}>
                  <button
                    type="submit"
                    className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                  >
                    Check Payment Status
                  </button>
                </form>
                {customer.email && (
                  <form action={sendForOnlinePaymentWithId}>
                    <button
                      type="submit"
                      className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                    >
                      Resend Link
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : customer.email ? (
            <>
              <p className="mt-1 text-sm text-zinc-500">
                Email the customer a QuickBooks-hosted link to pay this
                invoice by card or bank transfer.
              </p>
              <form action={sendForOnlinePaymentWithId} className="mt-3">
                <button
                  type="submit"
                  className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
                >
                  Send for Online Payment
                </button>
              </form>
            </>
          ) : (
            <p className="mt-1 text-sm text-zinc-400">
              Add an email to this customer&apos;s profile to send an online
              payment link.
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex items-end justify-between gap-3 print:hidden">
        {invoice.status === "paid" ? (
          <form action={markUnpaidWithId}>
            <button
              type="submit"
              className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Mark Unpaid
            </button>
          </form>
        ) : (
          <form action={markPaidWithId} className="flex items-end gap-3">
            <Field label="Payment Method (optional)" htmlFor="paymentMethod">
              <input
                id="paymentMethod"
                name="paymentMethod"
                placeholder="e.g. Cash, Card, Check"
                className={inputClass}
              />
            </Field>
            <button
              type="submit"
              className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
            >
              Mark Paid
            </button>
          </form>
        )}

        <form action={deleteInvoiceWithId}>
          <ConfirmButton
            message={`Delete invoice ${invoice.invoiceNumber}? This can't be undone.`}
            className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            Delete Invoice
          </ConfirmButton>
        </form>
      </div>
    </div>
  );
}
