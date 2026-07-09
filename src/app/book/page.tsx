import { listBookableCategories } from "@/lib/availability";
import { BookingForm } from "./BookingForm";
import { branding } from "@/lib/branding";
import { getAgreementSettings } from "@/lib/agreement";
import { UtmCapture } from "@/components/UtmCapture";

export const dynamic = "force-dynamic";

export default async function PublicBookingPage() {
  const categories = await listBookableCategories();
  const agreement = await getAgreementSettings();

  return (
    <div className="theme-light min-h-screen bg-brand-light px-4 py-10">
      <UtmCapture />
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            {branding.businessName}
          </h1>
          <p className="mt-1 text-zinc-600">Request a rental online</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          {categories.length === 0 ? (
            <p className="text-center text-zinc-500">
              Nothing is available to book online right now — please give us
              a call.
            </p>
          ) : (
            <BookingForm
              categories={categories.map((c) => ({
                id: c.id,
                name: c.name,
                description: c.description,
                imageUrl: c.imageUrl,
                basePrice: c.basePrice,
                pricingTiers: c.pricingTiers.map((t) => ({
                  id: t.id,
                  label: t.label,
                  days: t.days,
                  price: t.price,
                })),
              }))}
              agreementTitle={agreement.title}
              agreementContent={agreement.content}
            />
          )}
        </div>
      </div>
    </div>
  );
}
