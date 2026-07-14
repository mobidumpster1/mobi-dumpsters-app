import { listBookableCategories } from "@/lib/availability";
import { BookingForm } from "./BookingForm";
import { getAgreementSettings } from "@/lib/agreement";
import { getOrgBranding } from "@/lib/orgBranding";
import { UtmCapture } from "@/components/UtmCapture";
import { EmbedAutoResize } from "@/components/EmbedAutoResize";
import { getPublicOrganizationId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PublicBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string }>;
}) {
  const { embed } = await searchParams;
  const isEmbed = embed === "1";
  const organizationId = await getPublicOrganizationId();
  const [categories, agreement, branding] = await Promise.all([
    listBookableCategories(),
    getAgreementSettings(organizationId),
    getOrgBranding(organizationId),
  ]);

  return (
    <div
      className={
        isEmbed
          ? "theme-embed px-2 py-4"
          : "theme-light min-h-screen bg-brand-light px-4 py-10"
      }
      style={
        {
          "--rt-brand": branding.primaryColor,
          "--rt-brand-dark": branding.primaryColorDark,
        } as React.CSSProperties
      }
    >
      <UtmCapture />
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
