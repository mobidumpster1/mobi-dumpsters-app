import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireUser, hasPlan } from "@/lib/session";
import { parsePageData } from "@/lib/websiteSections";
import { getWebsiteBuilderPage } from "@/lib/websiteBuilderPage";
import { listWebsiteBuilderVersions } from "@/lib/websiteBuilderVersions";
import { listBookableCategories } from "@/lib/availability";
import { getAgreementSettings } from "@/lib/agreement";
import { getOrgBranding } from "@/lib/orgBranding";
import { PlanGateNotice } from "@/components/PlanGateNotice";
import { SectionEditor } from "@/components/websiteBuilder/SectionEditor";

export const dynamic = "force-dynamic";

export default async function WebsiteBuilderPage() {
  const user = await requireUser();
  if (user.role !== "owner") redirect("/");

  if (!hasPlan(user, "team")) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-3xl font-black tracking-tight text-ink">Website Builder</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Design a custom layout for your embedded booking widget.
        </p>
        <PlanGateNotice
          requiredPlan="team"
          description="Stack sections or drag blocks freely to design your own embedded widget layout."
        />
      </div>
    );
  }

  const organizationId = user.effectiveOrganizationId;
  const [page, org, versions, categories, agreement, branding] = await Promise.all([
    getWebsiteBuilderPage(organizationId),
    db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { publicDomain: true },
    }),
    listWebsiteBuilderVersions(organizationId),
    listBookableCategories(),
    getAgreementSettings(organizationId),
    getOrgBranding(organizationId),
  ]);

  const headerList = await headers();
  const baseUrl = org.publicDomain
    ? `https://${org.publicDomain}`
    : `https://${headerList.get("host") ?? "localhost:3000"}`;
  const previewUrl = `${baseUrl}/book?embed=1&builderPreview=1`;

  // A page that's never had its theme touched starts matching the
  // business's existing brand color, not a hardcoded literal — see
  // parsePageData/makeDefaultTheme.
  const { sections, theme } = parsePageData(page.sectionsJson, branding.primaryColor);

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
    crossSellCategoryIds: [],
    pricingTiers: c.pricingTiers.map((t) => ({ id: t.id, label: t.label, days: t.days, price: t.price })),
    materialOptions: c.materialOptions.map((m) => ({ id: m.id, name: m.name, unit: m.unit, pricePerUnit: m.pricePerUnit })),
  }));

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-ink">Website Builder</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Click any text or image on the page below to edit it directly, drag sections to reorder
        them, and hover a section for more controls. Nothing here affects your live embed until
        you hit Publish; use Preview to check it first.
      </p>

      <div className="mt-6">
        <SectionEditor
          initialSections={sections}
          initialTheme={theme}
          initialPublished={page.published}
          initialVersions={versions}
          canUseHtml={hasPlan(user, "pro")}
          previewUrl={previewUrl}
          categories={mappedCategories}
          bookingFormProps={{
            categories: mappedCategories,
            agreementTitle: agreement.title,
            agreementContent: agreement.content,
            isEmbed: false,
          }}
        />
      </div>
    </div>
  );
}
