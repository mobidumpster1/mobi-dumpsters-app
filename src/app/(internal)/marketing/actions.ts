"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, requirePlanFor } from "@/lib/session";

// Every status change here only ever touches this app's own database —
// nothing calls out to Google Ads or Search Console. Dismissing or
// actioning a recommendation is how a human closes the loop after
// reviewing it and (if they agree) making the change themselves in the
// actual ad account or on the actual page; this app never makes that
// change on their behalf.
export async function setRecommendationStatus(id: string, status: "dismissed" | "actioned") {
  const user = await requireUser();
  requirePlanFor(user, "pro");
  await db.marketingRecommendation.updateMany({
    where: { id, organizationId: user.effectiveOrganizationId },
    data: { status },
  });
  revalidatePath("/marketing");
}
