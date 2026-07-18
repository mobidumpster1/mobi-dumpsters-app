"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { requireUser, requirePlanFor } from "@/lib/session";
import {
  syncReviews,
  postReply,
  listLocations,
  selectLocation,
  getValidConnection,
  setSyncEnabled,
} from "@/lib/googleBusinessProfile";

export async function syncReviewsNow() {
  const user = await requireUser();
  requirePlanFor(user, "pro");

  const result = await syncReviews(user.effectiveOrganizationId);
  revalidatePath("/reviews");
  return result;
}

export async function replyToReview(reviewId: string, formData: FormData) {
  const user = await requireUser();
  requirePlanFor(user, "pro");

  const comment = str(formData, "comment");
  if (!comment) throw new Error("Write a reply before posting.");

  const review = await db.googleReview.findFirst({
    where: { id: reviewId, organizationId: user.effectiveOrganizationId },
  });
  if (!review) throw new Error("Review not found.");

  await postReply(user.effectiveOrganizationId, review.googleReviewId, comment);
  revalidatePath("/reviews");
}

export async function fetchAvailableLocations() {
  const user = await requireUser();
  requirePlanFor(user, "pro");

  const connection = await getValidConnection(user.effectiveOrganizationId);
  if (!connection) throw new Error("Connect Google Business Profile in Settings first.");

  return listLocations(connection);
}

export async function chooseLocation(locationId: string, locationName: string) {
  const user = await requireUser();
  requirePlanFor(user, "pro");

  await selectLocation(user.effectiveOrganizationId, locationId, locationName);
  revalidatePath("/reviews");
  revalidatePath("/settings");
}

export async function toggleReviewSync(syncEnabled: boolean) {
  const user = await requireUser();
  requirePlanFor(user, "pro");

  await setSyncEnabled(user.effectiveOrganizationId, syncEnabled);
  revalidatePath("/reviews");
  revalidatePath("/settings");
}
