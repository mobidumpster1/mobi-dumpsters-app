"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, requirePlanFor, hasPlan } from "@/lib/session";
import { getWebsiteBuilderPage } from "@/lib/websiteBuilderPage";
import { saveWebsiteBuilderVersion, getWebsiteBuilderVersion } from "@/lib/websiteBuilderVersions";
import { parsePageData, serializePageData, stripUngatedHtmlBlocks } from "@/lib/websiteSections";

// A neutral fallback — only ever used if `submitted` turns out to be a
// legacy bare-array value with no theme attached, which shouldn't happen
// from the running editor (it always submits the full {sections,theme}
// blob) but keeps parsePageData total either way.
const FALLBACK_BRAND_COLOR = "#3f6b2f";

// The one save action for the whole page — every section type (including
// a freeCanvas band's blocks) plus the page-level theme live in this one
// sectionsJson now, so there's nothing left to save separately. Called
// both by the explicit Save button and by the editor's 2s-debounced
// autosave; either way it also snapshots a recoverable version (see
// websiteBuilderVersions.ts).
export async function saveSections(formData: FormData) {
  const user = await requireUser();
  requirePlanFor(user, "team");
  const page = await getWebsiteBuilderPage(user.effectiveOrganizationId);

  const sectionsJson = formData.get("sectionsJson");
  const submitted = typeof sectionsJson === "string" ? sectionsJson : page.sectionsJson;
  const { sections, theme } = parsePageData(submitted, FALLBACK_BRAND_COLOR);
  const next = serializePageData(stripUngatedHtmlBlocks(sections, hasPlan(user, "pro")), theme);

  await db.websiteBuilderPage.update({
    where: { id: page.id },
    data: { sectionsJson: next },
  });
  await saveWebsiteBuilderVersion(user.effectiveOrganizationId, "Autosave", next);

  revalidatePath("/website-builder");
  revalidatePath("/book");
}

export async function togglePublished(published: boolean) {
  const user = await requireUser();
  requirePlanFor(user, "team");
  const page = await getWebsiteBuilderPage(user.effectiveOrganizationId);

  await db.websiteBuilderPage.update({
    where: { id: page.id },
    data: { published },
  });

  revalidatePath("/website-builder");
  revalidatePath("/book");
}

// Loads a saved version back as the current draft — does not publish it.
// Doesn't delete other versions, and doesn't even delete the version
// being restored (so restoring, then changing your mind, is itself
// recoverable — restoring writes a fresh "Autosave" snapshot of what was
// live right before the restore).
export async function restoreVersion(versionId: string): Promise<{ sectionsJson: string }> {
  const user = await requireUser();
  requirePlanFor(user, "team");
  const page = await getWebsiteBuilderPage(user.effectiveOrganizationId);
  const version = await getWebsiteBuilderVersion(user.effectiveOrganizationId, versionId);
  if (!version) throw new Error("That saved version couldn't be found.");

  await saveWebsiteBuilderVersion(user.effectiveOrganizationId, "Before restoring an older version", page.sectionsJson);
  await db.websiteBuilderPage.update({
    where: { id: page.id },
    data: { sectionsJson: version.sectionsJson },
  });

  revalidatePath("/website-builder");
  revalidatePath("/book");
  return { sectionsJson: version.sectionsJson };
}
