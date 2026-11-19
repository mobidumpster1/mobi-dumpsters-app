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
import { parsePageData, stripUngatedHtmlBlocks } from "@/lib/websiteSections";
import { getWebsiteBuilderPage } from "@/lib/websiteBuilderPage";
import { SectionList } from "@/components/websiteBuilder/SectionRenderer";
import { themeToCssVars } from "@/lib/websiteBuilderTheme";
import { FONT_VARIABLES_CLASS } from "@/lib/websiteBuilderFonts";
import { db } from "@/lib/db";
import { getOrgContact } from "@/lib/orgContact";

export const dynamic = "force-dynamic";

export default async function PublicBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string; category?: string; builderPreview?: string; theme?: string }>;
}) {
  const { embed, category, builderPreview, theme: themeParam } = await searchParams;
  const isEmbed = embed === "1";
  // Embedded on a business's own (usually dark) website it defaults to the
  // dark look so it doesn't sit there as a bolted-on white rectangle; opened
  // directly it defaults to the light look. ?theme=light or ?theme=dark
  // overrides either way.
  const isDark = themeParam === "dark" || (themeParam !== "light" && isEmbed);
  const organizationId = await getPublicOrganizationId();
  // Each business's own number (Settings -> Contact), never another business's.
  const [categories, agreement, branding, bookingAvailabilitySettings, websiteBuilderPage, org, contact] =
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
      getOrgContact(organizationId),
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
  const pageData = websiteBuilderPage ? parsePageData(websiteBuilderPage.sectionsJson, branding.primaryColor) : null;
  const builderSections = pageData ? stripUngatedHtmlBlocks(pageData.sections, org?.plan === "pro") : [];
  const useSections =
    isEmbed &&
    websiteBuilderPage !== null &&
    (websiteBuilderPage.published || builderPreview === "1") &&
    builderSections.length > 0;

  // The default (non-sections) booking widget keeps using the org's plain
  // branding color exactly as before; a published custom layout uses its
  // own page-level theme, which may have been customized away from that.
  const cssVars = useSections && pageData
    ? themeToCssVars(pageData.theme)
    : ({ "--rt-brand": branding.primaryColor, "--rt-brand-dark": branding.primaryColorDark } as React.CSSProperties);

  const themeClass = isDark ? (isEmbed ? "theme-embed" : "theme-public-dark") : "theme-booking";
  const layoutClass = isEmbed ? "px-2 py-4" : "min-h-screen bg-background px-4 py-8 sm:py-10";
  const wrapperStyle = { ...cssVars, "--font-display-face": "var(--font-archivo)" } as React.CSSProperties;

  return (
    <div className={`${FONT_VARIABLES_CLASS} ${themeClass} ${layoutClass}`} style={wrapperStyle}>
      <UtmCapture />
      <ReferralCapture />
      {isEmbed && <EmbedAutoResize />}
      {useSections ? (
        <SectionList
          sections={builderSections}
          categories={mappedCategories}
          bookingFormProps={{
            categories: mappedCategories,
            agreementTitle: agreement.title,
            agreementContent: agreement.content,
            initialCategoryId,
            isEmbed,
            contactPhone: contact.phone,
          }}
        />
      ) : (
        <div className="mx-auto max-w-2xl">
          {!isEmbed && (
            <header className="mb-5 overflow-hidden rounded-3xl bg-[color-mix(in_srgb,var(--rt-brand)_38%,#0a1207)] px-6 py-7 text-on-brand shadow-lg sm:px-8 sm:py-9">
              <div className="flex items-center gap-3">
                {branding.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={branding.logoUrl}
                    alt=""
                    className="h-12 w-12 rounded-xl bg-white object-contain p-1"
                  />
                )}
                <span className="font-display text-lg font-bold tracking-tight">{branding.businessName}</span>
              </div>
              <h1 className="mt-5 font-display text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
                Book your rental online. <span className="text-accent">It takes three simple steps.</span>
              </h1>
              <p className="mt-3 max-w-lg text-base text-on-brand/80">
                Pick what you need, choose your dates, and tell us where it goes.
              </p>
              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-on-brand/90">
                {["Prices shown up front", "We confirm every request"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="grid h-[18px] w-[18px] place-items-center rounded-full bg-accent text-[11px] font-extrabold text-accent-ink"
                    >
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </header>
          )}
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_8px_30px_rgb(0_0_0/0.08)] sm:p-7">
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
                contactPhone={contact.phone}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
