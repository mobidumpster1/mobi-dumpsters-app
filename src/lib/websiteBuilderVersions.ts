import { db } from "@/lib/db";

// A rolling safety net, not full version history — every save that's
// worth being able to get back to (an autosave tick, a snapshot taken
// right before a destructive Start Over, an archived draft from the
// unified-page migration) writes one row here, and each org is pruned
// back down to its most recent WEBSITE_BUILDER_MAX_VERSIONS afterward.
// No per-label special-casing (e.g. autosave doesn't overwrite a single
// slot) — that would mean only ever having one autosave to look back at,
// which defeats "browse recent versions."
export const WEBSITE_BUILDER_MAX_VERSIONS = 10;

export async function saveWebsiteBuilderVersion(organizationId: string, label: string, sectionsJson: string) {
  await db.websiteBuilderPageVersion.create({
    data: { organizationId, label, sectionsJson },
  });

  const stale = await db.websiteBuilderPageVersion.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    skip: WEBSITE_BUILDER_MAX_VERSIONS,
    select: { id: true },
  });
  if (stale.length > 0) {
    await db.websiteBuilderPageVersion.deleteMany({
      where: { organizationId, id: { in: stale.map((v) => v.id) } },
    });
  }
}

export async function listWebsiteBuilderVersions(organizationId: string) {
  return db.websiteBuilderPageVersion.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, createdAt: true },
  });
}

export async function getWebsiteBuilderVersion(organizationId: string, versionId: string) {
  return db.websiteBuilderPageVersion.findFirst({
    where: { id: versionId, organizationId },
  });
}
