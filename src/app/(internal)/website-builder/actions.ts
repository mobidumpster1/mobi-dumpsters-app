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
