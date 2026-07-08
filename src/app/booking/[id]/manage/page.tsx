import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { branding } from "@/lib/branding";
import { formatDate } from "@/lib/date";
import { requestExtension, requestDumpAndReturn } from "./actions";

export const dynamic = "force-dynamic";

export default async function ManageBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ requested?: string }>;
}) {
  const { id } = await params;
  const { requested } = await searchParams;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { equipmentItem: { include: { category: true } } } },
    },
  });
  if (!booking) notFound();

  const activeItems = booking.items.filter((item) => item.actualReturnDate === null);
  const isActive = booking.status === "confirmed" && activeItems.length > 0;

  const requestExtensionWithId = requestExtension.bind(null, booking.id);
  const requestDumpAndReturnWithId = requestDumpAndReturn.bind(null, booking.id);

  return (
    <div className="theme-light min-h-screen bg-brand-light px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            {branding.businessName}
          </h1>
          <p className="mt-1 text-zinc-600">Manage Your Rental</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Hi {booking.customer.name},</p>
          <div className="mt-2 flex flex-col gap-1">
            {activeItems.map((item) => (
              <p key={item.id} className="text-sm text-zinc-700">
                <span className="font-semibold text-ink">{item.equipmentItem.label}</span>{" "}
                ({item.equipmentItem.category.name}) — expected return{" "}
                {formatDate(item.expectedReturnDate)}
              </p>
            ))}
          </div>
          <p className="mt-2 text-sm text-zinc-500">{booking.deliveryAddress}</p>

          {requested === "extension" && (
            <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              Got it — we'll be in touch to confirm your extension.
            </p>
          )}
          {requested === "dump" && (
            <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              Got it — we'll be in touch to schedule the dump & return.
            </p>
          )}

          {!isActive && !requested && (
            <p className="mt-4 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
              This rental doesn't have anything active to request changes on
              right now. Call or text us at {branding.phone} if you need
              anything.
            </p>
          )}

          {isActive && (
            <div className="mt-6 flex flex-col gap-6">
              <div className="rounded-xl border border-zinc-200 p-4">
                <p className="font-semibold text-ink">Need more time?</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Request an extension and we'll confirm availability and any
                  extra cost.
                </p>
                <form action={requestExtensionWithId} className="mt-3 flex flex-col gap-2">
                  <label className="text-xs font-medium text-zinc-600" htmlFor="newDate">
                    Keep it until
                  </label>
                  <input
                    id="newDate"
                    name="newDate"
                    type="date"
                    required
                    className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm"
                  />
                  <input
                    name="note"
                    placeholder="Anything else we should know? (optional)"
                    className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm"
                  />
                  <button
                    type="submit"
                    className="mt-1 self-start rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
                  >
                    Request Extension
                  </button>
                </form>
              </div>

              <div className="rounded-xl border border-zinc-200 p-4">
                <p className="font-semibold text-ink">Full already?</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Ask us to come empty it and bring it right back, instead of
                  a final pickup.
                </p>
                <form action={requestDumpAndReturnWithId} className="mt-3 flex flex-col gap-2">
                  <input
                    name="note"
                    placeholder="Anything else we should know? (optional)"
                    className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm"
                  />
                  <button
                    type="submit"
                    className="mt-1 self-start rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                  >
                    Request Dump & Return
                  </button>
                </form>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-zinc-400">
            Prefer to talk? Call or text {branding.phone}.
          </p>
        </div>
      </div>
    </div>
  );
}
