"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteUploadedFile } from "@/lib/uploads";
import { requirePermission, requirePlanFor } from "@/lib/session";

export async function uploadQuotePhoto(
  quoteId: string,
  data: { filePath: string; mediaType: string; type: string; caption: string }
) {
  const user = await requirePermission("canManageInvoices");
  requirePlanFor(user, "team");
  await db.quote.findFirstOrThrow({
    where: { id: quoteId, organizationId: user.effectiveOrganizationId },
  });

  await db.quotePhoto.create({
    data: {
      quoteId,
      filePath: data.filePath,
      mediaType: data.mediaType,
      type: data.type || "other",
      caption: data.caption || null,
    },
  });

  revalidatePath(`/quotes/${quoteId}`);
}

export async function deleteQuotePhoto(photoId: string) {
  const user = await requirePermission("canManageInvoices");
  requirePlanFor(user, "team");
  await db.quotePhoto.findFirstOrThrow({
    where: { id: photoId, quote: { organizationId: user.effectiveOrganizationId } },
  });

  const photo = await db.quotePhoto.delete({ where: { id: photoId } });
  await deleteUploadedFile(photo.filePath);
  revalidatePath(`/quotes/${photo.quoteId}`);
}
