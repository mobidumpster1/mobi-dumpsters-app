"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, requirePlanFor, hasPlan } from "@/lib/session";
import { getWebsiteBuilderPage } from "@/lib/websiteBuilderPage";
import { saveWebsiteBuilderVersion, getWebsiteBuilderVersion } from "@/lib/websiteBuilderVersions";
import { parseSections, serializeSections, stripUngatedHtmlBlocks } from "@/lib/websiteSections";

// The one save action for the whole page — every section type (including
// a freeCanvas band's blocks) lives in this one sectionsJson now, so
// there's nothing left to save separately. Called both by the explicit
// Save button and by the editor's 2s-debounced autosave; either way it
// also snapshots a recoverable version (see websiteBuilderVersions.ts).
export async function saveSections(formData: FormData) {
  const user = await requireUser();
  requirePlanFor(user, "team");
  const page = await getWebsiteBuilderPage(user.effectiveOrganizationId);

  const sectionsJson = formData.get("sectionsJson");
  const submitted = typeof sectionsJson === "string" ? sectionsJson : page.sectionsJson;
  const next = serializeSections(stripUngatedHtmlBlocks(parseSections(submitted), hasPlan(user, "pro")));

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
