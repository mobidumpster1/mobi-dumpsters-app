import Link from "next/link";
import { notFound } from "next/navigation";
import { existsSync } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { markPaid, markUnpaid, deleteInvoice } from "../actions";
import { uploadInvoicePhoto, deleteInvoicePhoto } from "../photoActions";
import { ChargeCardButton, SendCheckoutLinkButton } from "../InvoicePaymentActions";
import {
  createPaymentSchedule,
  deleteInstallment,
  markInstallmentPaid,
  markInstallmentUnpaid,
} from "../installmentActions";
import { ChargeInstallmentButton, SendInstallmentCheckoutLinkButton } from "../InstallmentPaymentActions";
import { getStripeConnection } from "@/lib/stripe";
import { Field, inputClass } from "@/components/Field";
import { PrintButton } from "@/components/PrintButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { MediaUploadForm } from "@/components/MediaUploadForm";
import { MediaGrid } from "@/components/MediaGrid";
import { InstallmentScheduleBuilder } from "@/components/InstallmentScheduleBuilder";
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
  const invoice = await db.invoice.findFirst({
    where: { id, organizationId: user.effectiveOrganizationId },
    include: {
      booking: { include: { customer: true } },
      customer: true,
      lineItems: { orderBy: { createdAt: "asc" } },
      photos: { orderBy: { createdAt: "desc" } },
      installments: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!invoice) notFound();

  const markPaidWithId = markPaid.bind(null, invoice.id);
  const markUnpaidWithId = markUnpaid.bind(null, invoice.id);
  const deleteInvoiceWithId = deleteInvoice.bind(null, invoice.id);
  const displayStatus = computeDisplayStatus(invoice.status, invoice.dueDate);
  const customer = invoice.booking?.customer ?? invoice.customer;
  const stripeConnection = await getStripeConnection(user.effectiveOrganizationId);
  const logoExists = existsSync(
    path.join(process.cwd(), "public", branding.logoPath)
  );

  return (
    <div className="max-w-2xl">
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

      <div className="mt-6 rounded-lg border-2 border-zinc-900 bg-white p-5 print:hidden">
        <h2 className="text-lg font-semibold text-ink">Attachments</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Receipts, signed proof of completion, or anything else worth keeping with this invoice.
        </p>
        <MediaUploadForm
          uploadAction={uploadInvoicePhoto.bind(null, invoice.id)}
          typeOptions={[{ value: "other", label: "File" }]}
          defaultType="other"
          folder={`invoices/${invoice.id}`}
        />
        <MediaGrid items={invoice.photos} deleteAction={deleteInvoicePhoto} />
      </div>

      {invoice.status !== "paid" && customer && invoice.installments.length === 0 && (
        <div className="mt-6 rounded-lg border-2 border-zinc-900 bg-white p-5 print:hidden">
          <h2 className="text-lg font-semibold text-ink">Payment</h2>
          {!stripeConnection ? (
            <p className="mt-1 text-sm text-zinc-400">
              Connect Stripe in Settings to charge cards or send payment
              links from here.
            </p>
          ) : customer.stripePaymentMethodId ? (
            <>
              <p className="mt-1 text-sm text-zinc-500">
                Card on file:{" "}
                <span className="font-medium text-zinc-700 capitalize">
                  {customer.stripeCardBrand}
                </span>{" "}
                ····{customer.stripeCardLast4}
              </p>
              <ChargeCardButton invoiceId={invoice.id} amount={invoice.amount} />
            </>
          ) : customer.email ? (
            <>
              <p className="mt-1 text-sm text-zinc-500">
                No card on file for this customer yet — email them a
                Stripe-hosted payment link instead. Paying it also saves
                their card for next time.
              </p>
              <SendCheckoutLinkButton invoiceId={invoice.id} />
            </>
          ) : (
            <p className="mt-1 text-sm text-zinc-400">
              Add an email to this customer&apos;s profile to send a payment
              link.
            </p>
          )}
        </div>
      )}

      {(invoice.installments.length > 0 || invoice.status !== "paid") && (
        <div className="mt-6 rounded-lg border-2 border-zinc-900 bg-white p-5 print:hidden">
          <h2 className="text-lg font-semibold text-ink">Payment Schedule</h2>
          {invoice.installments.length === 0 ? (
            <>
              <p className="mt-1 text-sm text-zinc-500">
                Split this invoice into scheduled partial payments (e.g. a deposit and a balance)
                instead of one full charge. Skip this if you&apos;d rather just charge the invoice
                in full above.
              </p>
              <div className="mt-3">
                <InstallmentScheduleBuilder
                  invoiceAmount={invoice.amount}
                  createAction={createPaymentSchedule.bind(null, invoice.id)}
                />
              </div>
            </>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {invoice.installments.map((installment) => (
                <div
                  key={installment.id}
                  className="rounded-xl border border-zinc-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-zinc-900">
                        {installment.label} — ${installment.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {installment.dueDate ? `Due ${formatDate(installment.dueDate)}` : "No due date"}
                      </p>
                    </div>
                    {installment.status === "paid" ? (
                      <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-black text-white">
                        Paid{installment.paymentMethod ? ` — ${installment.paymentMethod}` : ""}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-white">
                        Pending
                      </span>
                    )}
                  </div>

                  {installment.status === "paid" ? (
                    <form action={markInstallmentUnpaid.bind(null, installment.id)} className="mt-3">
                      <button
                        type="submit"
                        className="text-sm font-semibold text-zinc-600 hover:underline"
                      >
                        Mark Unpaid
                      </button>
                    </form>
                  ) : (
                    <div className="mt-3 flex flex-col gap-3">
                      {customer && stripeConnection && (
                        customer.stripePaymentMethodId ? (
                          <ChargeInstallmentButton installmentId={installment.id} amount={installment.amount} />
                        ) : customer.email ? (
                          <SendInstallmentCheckoutLinkButton installmentId={installment.id} />
                        ) : null
                      )}
                      <div className="flex flex-wrap items-end gap-2">
                        <form
                          action={markInstallmentPaid.bind(null, installment.id)}
                          className="flex flex-wrap items-end gap-2"
                        >
                          <Field label="Payment Method (optional)" htmlFor={`paymentMethod-${installment.id}`}>
                            <input
                              id={`paymentMethod-${installment.id}`}
                              name="paymentMethod"
                              placeholder="e.g. Cash, Card, Check"
                              className={inputClass}
                            />
                          </Field>
                          <button
                            type="submit"
                            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                          >
                            Mark Paid
                          </button>
                        </form>
                        <form action={deleteInstallment.bind(null, installment.id)}>
                          <ConfirmButton
                            message={`Remove the "${installment.label}" payment from this schedule?`}
                            className="text-sm font-semibold text-red-600 hover:underline"
                          >
                            Remove
                          </ConfirmButton>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex items-end justify-between gap-3 print:hidden">
        {invoice.installments.length > 0 ? (
          // Once a payment schedule exists, paid/unpaid status is driven
          // entirely by the individual installments above — a whole-invoice
          // toggle here would desync the two (e.g. marking the invoice paid
          // while installments still show pending).
          <div />
        ) : invoice.status === "paid" ? (
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
