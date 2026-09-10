"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, requirePlanFor } from "@/lib/session";
import { getWebsiteBuilderPage } from "@/lib/websiteBuilderPage";

export async function saveWebsiteBuilderPage(formData: FormData) {
  const user = await requireUser();
  requirePlanFor(user, "team");
  const page = await getWebsiteBuilderPage(user.effectiveOrganizationId);

  const blocksJson = formData.get("blocksJson");
  const canvasWidth = Number(formData.get("canvasWidth")) || page.canvasWidth;
  const canvasHeight = Number(formData.get("canvasHeight")) || page.canvasHeight;

  await db.websiteBuilderPage.update({
    where: { id: page.id },
    data: {
      blocksJson: typeof blocksJson === "string" ? blocksJson : page.blocksJson,
      canvasWidth,
      canvasHeight,
    },
  });

  revalidatePath("/website-builder");
  revalidatePath("/book");
}

// `mode`, when given, is which editor is being published — Canvas and
// Sections each publish independently, so hitting Publish always makes
// *that* editor's content live (and the other one just stays saved,
// ready to publish later without having lost anything).
export async function togglePublished(published: boolean, mode?: "canvas" | "sections") {
  const user = await requireUser();
  requirePlanFor(user, "team");
  const page = await getWebsiteBuilderPage(user.effectiveOrganizationId);

  await db.websiteBuilderPage.update({
    where: { id: page.id },
    data: { published, ...(mode && published ? { builderMode: mode } : {}) },
  });

  revalidatePath("/website-builder");
  revalidatePath("/book");
}
