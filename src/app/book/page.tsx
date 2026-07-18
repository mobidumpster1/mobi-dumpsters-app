import { listBookableCategories } from "@/lib/availability";
import { BookingForm } from "./BookingForm";
import { getAgreementSettings } from "@/lib/agreement";
import { getOrgBranding } from "@/lib/orgBranding";
import { UtmCapture } from "@/components/UtmCapture";
import { ReferralCapture } from "@/components/ReferralCapture";
import { EmbedAutoResize } from "@/components/EmbedAutoResize";
import { getPublicOrganizationId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PublicBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string; category?: string }>;
}) {
  const { embed, category } = await searchParams;
  const isEmbed = embed === "1";
  const organizationId = await getPublicOrganizationId();
  const [categories, agreement, branding] = await Promise.all([
    listBookableCategories(),
    getAgreementSettings(organizationId),
    getOrgBranding(organizationId),
  ]);
  // Lets a link on Chase's own website (e.g. the Junk Removal section) go
  // straight to that category's review step, instead of dropping the
  // customer on the full "what do you need?" grid. Matched by name, not
  // id, so the link Chase pastes into static HTML doesn't break if a
  // category gets recreated.
  const initialCategoryId = category
    ? categories.find((c) => c.name.toLowerCase() === category.toLowerCase())?.id
    : undefined;

  return (
    <div
      className={
        isEmbed
          ? "theme-embed px-2 py-4"
          : "theme-public-dark min-h-screen bg-background px-4 py-10"
      }
      style={
        {
          "--rt-brand": branding.primaryColor,
          "--rt-brand-dark": branding.primaryColorDark,
        } as React.CSSProperties
      }
    >
      <UtmCapture />
      <ReferralCapture />
      {isEmbed && <EmbedAutoResize />}
      <div className="mx-auto max-w-xl">
        {!isEmbed && (
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              {branding.businessName}
            </h1>
            <p className="mt-1 text-zinc-600">Request a rental online</p>
          </div>
        )}
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
                dimensions: c.dimensions,
                bookingNote: c.bookingNote,
                imageUrl: c.imageUrl,
                basePrice: c.basePrice,
                includedDays: c.includedDays,
                overageDayRate: c.overageDayRate,
                includedTonnage: c.includedTonnage,
                overageTonnageRate: c.overageTonnageRate,
                includedMileage: c.includedMileage,
                overageMileageRate: c.overageMileageRate,
                bundleQuantity: c.bundleQuantity,
                pricingTiers: c.pricingTiers.map((t) => ({
                  id: t.id,
                  label: t.label,
                  days: t.days,
                  price: t.price,
                })),
                materialOptions: c.materialOptions.map((m) => ({
                  id: m.id,
                  name: m.name,
                  unit: m.unit,
                  pricePerUnit: m.pricePerUnit,
                })),
              }))}
              agreementTitle={agreement.title}
              agreementContent={agreement.content}
              initialCategoryId={initialCategoryId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
