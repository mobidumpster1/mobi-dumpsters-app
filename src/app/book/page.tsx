import { listBookableCategories } from "@/lib/availability";
import { BookingForm } from "./BookingForm";
import { getAgreementSettings } from "@/lib/agreement";
import { getOrgBranding } from "@/lib/orgBranding";
import { UtmCapture } from "@/components/UtmCapture";
import { ReferralCapture } from "@/components/ReferralCapture";
import { EmbedAutoResize } from "@/components/EmbedAutoResize";
import { getPublicOrganizationId } from "@/lib/session";
import { getBookingAvailabilitySettings } from "@/lib/bookingAvailabilitySettings";
import { parseCrossSellCategoryIds } from "@/lib/crossSell";
import { parseSections, stripUngatedHtmlBlocks } from "@/lib/websiteSections";
import { getWebsiteBuilderPage } from "@/lib/websiteBuilderPage";
import { SectionList } from "@/components/websiteBuilder/SectionRenderer";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PublicBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string; category?: string; builderPreview?: string }>;
}) {
  const { embed, category, builderPreview } = await searchParams;
  const isEmbed = embed === "1";
  const organizationId = await getPublicOrganizationId();
  const [categories, agreement, branding, bookingAvailabilitySettings, websiteBuilderPage, org] =
    await Promise.all([
      listBookableCategories(),
      getAgreementSettings(organizationId),
      getOrgBranding(organizationId),
      getBookingAvailabilitySettings(organizationId),
      // Only the embed can ever use a custom layout — a direct /book visit
      // (not iframed) always gets the default widget, so this lookup is
      // free to skip there. See the Website Builder feature.
      isEmbed ? getWebsiteBuilderPage(organizationId) : Promise.resolve(null),
      isEmbed ? db.organization.findUnique({ where: { id: organizationId }, select: { plan: true } }) : Promise.resolve(null),
    ]);
  // Lets a link on Chase's own website (e.g. the Junk Removal section) go
  // straight to that category's review step, instead of dropping the
  // customer on the full "what do you need?" grid. Matched by name, not
  // id, so the link Chase pastes into static HTML doesn't break if a
  // category gets recreated.
  const initialCategoryId = category
    ? categories.find((c) => c.name.toLowerCase() === category.toLowerCase())?.id
    : undefined;

  const mappedCategories = categories.map((c) => ({
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
    securityDepositAmount: c.securityDepositAmount,
    bundleQuantity: c.bundleQuantity,
    crossSellCategoryIds: parseCrossSellCategoryIds(c.crossSellCategoryIds),
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
  }));

  // A custom layout only ever takes over when it's actually embedded AND
  // either published (live) or being checked via ?builderPreview=1 (so
  // Chase can look at a draft before flipping it live) AND has at least
  // one section — otherwise it's today's exact default widget, unchanged.
  // HTML embed blocks are stripped here too (not just on save) so a plan
  // downgrade after saving one can never leave it rendering live.
  const builderSections = websiteBuilderPage
    ? stripUngatedHtmlBlocks(parseSections(websiteBuilderPage.sectionsJson), org?.plan === "pro")
    : [];
  const useSections =
    isEmbed &&
    websiteBuilderPage !== null &&
    (websiteBuilderPage.published || builderPreview === "1") &&
    builderSections.length > 0;

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
      {useSections ? (
        <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <SectionList
            sections={builderSections}
            categories={mappedCategories}
            bookingFormProps={{
              categories: mappedCategories,
              agreementTitle: agreement.title,
              agreementContent: agreement.content,
              initialCategoryId,
              isEmbed,
            }}
          />
        </div>
      ) : (
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
            {bookingAvailabilitySettings.awayModeEnabled ? (
              <p className="text-center text-zinc-500">{bookingAvailabilitySettings.awayModeMessage}</p>
            ) : categories.length === 0 ? (
              <p className="text-center text-zinc-500">
                Nothing is available to book online right now — please give us
                a call.
              </p>
            ) : (
              <BookingForm
                categories={mappedCategories}
                agreementTitle={agreement.title}
                agreementContent={agreement.content}
                initialCategoryId={initialCategoryId}
                isEmbed={isEmbed}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
