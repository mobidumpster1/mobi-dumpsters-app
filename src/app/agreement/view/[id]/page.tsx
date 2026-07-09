import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { branding } from "@/lib/branding";
import { formatDate } from "@/lib/date";
import { computeBookingStatus } from "@/lib/bookingStatus";

export const dynamic = "force-dynamic";

function orderStatusLabel(booking: {
  status: string;
  items: { deliveredAt: Date | null; actualReturnDate: Date | null }[];
}) {
  if (booking.status === "pending") return "Awaiting Confirmation";
  if (booking.status === "cancelled") return "Cancelled";
  return computeBookingStatus(booking.items);
}

export default async function ViewSignedAgreementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agreement = await db.signedAgreement.findUnique({
    where: { id },
    include: {
      booking: {
        include: { items: { include: { equipmentItem: { include: { category: true } } } } },
      },
    },
  });
  if (!agreement) notFound();

  const booking = agreement.booking;
  const total = booking?.items.reduce((sum, item) => sum + item.price, 0) ?? 0;

  return (
    <div className="theme-light min-h-screen bg-brand-light px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            {branding.businessName}
          </h1>
          <p className="mt-1 text-zinc-600">Order Confirmation</p>
        </div>

        {booking && (
          <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Your Order</h2>
              <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
                {orderStatusLabel(booking)}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-500">{booking.deliveryAddress}</p>
            <div className="mt-4 flex flex-col gap-3">
              {booking.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 p-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-ink">
                      {item.equipmentItem.label}{" "}
                      <span className="text-zinc-400">
                        ({item.equipmentItem.category.name})
                      </span>
                    </p>
                    <p className="text-zinc-500">
                      {formatDate(item.startDate)} – {formatDate(item.expectedReturnDate)}
                    </p>
                  </div>
                  <p className="font-semibold text-ink">${item.price.toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
              <p className="text-sm font-medium text-zinc-500">Total</p>
              <p className="text-base font-bold text-ink">${total.toFixed(2)}</p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">{agreement.agreementTitle}</h2>
          <div className="mt-3 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">
            <p>
              <span className="font-semibold text-ink">Signed by:</span>{" "}
              {agreement.signerName}
            </p>
            <p className="mt-1">
              <span className="font-semibold text-ink">Date:</span>{" "}
              {formatDate(agreement.agreedAt)}
            </p>
          </div>

          <div className="mt-4 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
            {agreement.agreementText}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Questions? Call or text us at {branding.smsPhone}.
        </p>
      </div>
    </div>
  );
}
