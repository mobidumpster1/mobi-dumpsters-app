import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/date";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PromoCodeForm } from "./PromoCodeForm";
import { setPromoCodeActive, deletePromoCode } from "./actions";

export const dynamic = "force-dynamic";

function valueLabel(type: string, value: number) {
  return type === "percent" ? `${value}% off` : `$${value.toFixed(2)} off`;
}

export default async function PromotionsPage() {
  const user = await requireUser();
  const codes = await db.promoCode.findMany({
    where: { organizationId: user.effectiveOrganizationId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-ink">Promotions</h1>
      <p className="mt-1 text-zinc-500">
        Discount codes customers can enter on your booking page, or staff can apply on a
        phone booking.
      </p>

      <div className="mt-6">
        <PromoCodeForm />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {codes.map((code) => {
          const expired = code.expiresAt !== null && code.expiresAt < new Date();
          const maxedOut = code.maxRedemptions !== null && code.redemptionCount >= code.maxRedemptions;
          return (
            <div
              key={code.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-zinc-900 bg-white p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold text-ink">{code.code}</span>
                  {!code.active && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-500">
                      Off
                    </span>
                  )}
                  {expired && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      Expired
                    </span>
                  )}
                  {maxedOut && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      Fully redeemed
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-600">{valueLabel(code.type, code.value)}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Used {code.redemptionCount}
                  {code.maxRedemptions !== null ? ` of ${code.maxRedemptions}` : ""} time
                  {code.redemptionCount === 1 ? "" : "s"}
                  {code.expiresAt && ` · Expires ${formatDate(code.expiresAt)}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <form action={setPromoCodeActive.bind(null, code.id, !code.active)}>
                  <button
                    type="submit"
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    {code.active ? "Turn Off" : "Turn On"}
                  </button>
                </form>
                <form action={deletePromoCode.bind(null, code.id)}>
                  <ConfirmButton
                    message={`Delete promo code "${code.code}"? This can't be undone.`}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </ConfirmButton>
                </form>
              </div>
            </div>
          );
        })}
        {codes.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            No promo codes yet — create one above.
          </p>
        )}
      </div>
    </div>
  );
}
