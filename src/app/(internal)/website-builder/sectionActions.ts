"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, requirePlanFor } from "@/lib/session";
import { getWebsiteBuilderPage } from "@/lib/websiteBuilderPage";

export async function saveSections(formData: FormData) {
  const user = await requireUser();
  requirePlanFor(user, "team");
  const page = await getWebsiteBuilderPage(user.effectiveOrganizationId);

  const sectionsJson = formData.get("sectionsJson");

  await db.websiteBuilderPage.update({
    where: { id: page.id },
    data: {
      sectionsJson: typeof sectionsJson === "string" ? sectionsJson : page.sectionsJson,
    },
  });

  revalidatePath("/website-builder");
  revalidatePath("/book");
}

export async function setBuilderMode(mode: "canvas" | "sections") {
  const user = await requireUser();
  requirePlanFor(user, "team");
  const page = await getWebsiteBuilderPage(user.effectiveOrganizationId);

  await db.websiteBuilderPage.update({
    where: { id: page.id },
    data: { builderMode: mode },
  });

  revalidatePath("/website-builder");
  revalidatePath("/book");
}
