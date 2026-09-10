import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { requireUser, hasPlan } from "@/lib/session";
import { parseBlocks } from "@/lib/websiteBuilder";
import { parseSections } from "@/lib/websiteSections";
import { getWebsiteBuilderPage } from "@/lib/websiteBuilderPage";
import { PlanGateNotice } from "@/components/PlanGateNotice";
import { BuilderModeTabs } from "@/components/websiteBuilder/BuilderModeTabs";

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
          description="Drag text, images, and the booking form itself anywhere on a canvas to design your own embedded widget layout."
        />
      </div>
    );
  }

  const [page, org] = await Promise.all([
    getWebsiteBuilderPage(user.effectiveOrganizationId),
    db.organization.findUniqueOrThrow({
      where: { id: user.effectiveOrganizationId },
      select: { publicDomain: true },
    }),
  ]);

  const headerList = await headers();
  const baseUrl = org.publicDomain
    ? `https://${org.publicDomain}`
    : `https://${headerList.get("host") ?? "localhost:3000"}`;
  const previewUrl = `${baseUrl}/book?embed=1&builderPreview=1`;

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-ink">Website Builder</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Design a custom layout for your embedded booking widget — drag blocks anywhere, resize
        them, layer them. Nothing here affects your live embed until you hit Publish; use Preview
        to check it first.
      </p>

      <div className="mt-6">
        <BuilderModeTabs
          initialMode={page.builderMode === "sections" ? "sections" : "canvas"}
          canvasProps={{
            initialBlocks: parseBlocks(page.blocksJson),
            canvasWidth: page.canvasWidth,
            canvasHeight: page.canvasHeight,
            initialPublished: page.published && page.builderMode === "canvas",
            previewUrl,
          }}
          sectionsProps={{
            initialSections: parseSections(page.sectionsJson),
            initialPublished: page.published && page.builderMode === "sections",
            previewUrl,
          }}
        />
      </div>
    </div>
  );
}
