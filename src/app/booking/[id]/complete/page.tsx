import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getOrgBranding } from "@/lib/orgBranding";
import { branding as staticBranding } from "@/lib/branding";
import { getAgreementSettings } from "@/lib/agreement";
import { formatDate } from "@/lib/date";
import { Field, inputClass } from "@/components/Field";
import { SignaturePad } from "@/components/SignaturePad";
import { completeBookingSigning, payForBooking } from "./actions";

export const dynamic = "force-dynamic";

export default async function CompleteBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string; signed?: string; nopay?: string }>;
}) {
  const { id } = await params;
  const { done, signed, nopay } = await searchParams;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { equipmentItem: { include: { category: true } } } },
      invoices: true,
      signedAgreements: { orderBy: { agreedAt: "desc" }, take: 1 },
    },
  });
  if (!booking) notFound();

  const branding = await getOrgBranding(booking.organizationId);
  const agreement = await getAgreementSettings(booking.organizationId);
  const alreadySigned = booking.signedAgreements.length > 0;
  const invoice = booking.invoices[0];
  const isPaid = invoice?.status === "paid";
  const total = booking.items.reduce((sum, item) => sum + item.price, 0);

  const signWithId = completeBookingSigning.bind(null, booking.id);
  const payWithId = payForBooking.bind(null, booking.id);

  return (
    <div className="theme-light min-h-screen bg-brand-light px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink">{branding.businessName}</h1>
          <p className="mt-1 text-zinc-600">Finish Your Booking</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Hi {booking.customer.name},</p>
          <div className="mt-2 flex flex-col gap-1">
            {booking.items.map((item) => (
              <p key={item.id} className="text-sm text-zinc-700">
                <span className="font-semibold text-ink">{item.equipmentItem.category.name}</span>{" "}
                — {formatDate(item.startDate)} to {formatDate(item.expectedReturnDate)}
              </p>
            ))}
          </div>
          <p className="mt-2 text-sm text-zinc-500">{booking.deliveryAddress}</p>
          {total > 0 && (
            <p className="mt-2 text-lg font-bold text-ink">${total.toFixed(2)}</p>
          )}

          {done === "1" && (
            <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              All set — signed and paid. We&apos;ll see you soon!
            </p>
          )}

          {done !== "1" && (alreadySigned || signed === "1") && (
            <div className="mt-4 flex flex-col gap-3">
              <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                Signed — thanks!
              </p>
              {nopay === "1" ? (
                <p className="text-sm text-zinc-500">
                  We&apos;ll be in touch about payment separately.
                </p>
              ) : !isPaid ? (
                <form action={payWithId}>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-brand px-5 py-4 text-base font-bold text-white transition-colors hover:bg-brand-dark"
                  >
                    Pay Now
                  </button>
                </form>
              ) : (
                <p className="text-sm text-zinc-500">Already paid — you&apos;re all set.</p>
              )}
            </div>
          )}

          {done !== "1" && !alreadySigned && signed !== "1" && (
            <>
              <div className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border-2 border-zinc-900 bg-white p-4 text-xs text-zinc-700">
                <p className="mb-2 text-sm font-bold text-ink">{agreement.title}</p>
                {agreement.content}
              </div>

              <form action={signWithId} className="mt-6 flex flex-col gap-4">
                <Field label="Printed Name" htmlFor="signerName">
                  <input
                    id="signerName"
                    name="signerName"
                    required
                    defaultValue={booking.customer.name}
                    className={inputClass}
                  />
                </Field>

                {!booking.customer.email && (
                  <Field label="Email (for your receipt)" htmlFor="email">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      className={inputClass}
                    />
                  </Field>
                )}

                <Field label="Signature" htmlFor="signature">
                  <SignaturePad name="signatureUrl" folder={`agreements/${booking.id}`} required />
                </Field>

                <button
                  type="submit"
                  className="rounded-xl bg-brand px-5 py-4 text-base font-bold text-white transition-colors hover:bg-brand-dark"
                >
                  Sign &amp; Continue
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-xs text-zinc-400">
            Questions? Call or text {staticBranding.smsPhone}.
          </p>
        </div>
      </div>
    </div>
  );
}
