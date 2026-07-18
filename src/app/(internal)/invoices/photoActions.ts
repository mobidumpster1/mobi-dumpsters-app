"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteUploadedFile } from "@/lib/uploads";
import { requirePermission } from "@/lib/session";

export async function uploadInvoicePhoto(
  invoiceId: string,
  data: { filePath: string; mediaType: string; type: string; caption: string }
) {
  const user = await requirePermission("canManageInvoices");
  await db.invoice.findFirstOrThrow({
    where: { id: invoiceId, organizationId: user.effectiveOrganizationId },
  });

  await db.invoicePhoto.create({
    data: {
      invoiceId,
      filePath: data.filePath,
      mediaType: data.mediaType,
      type: data.type || "other",
      caption: data.caption || null,
    },
  });

  revalidatePath(`/invoices/${invoiceId}`);
}

export async function deleteInvoicePhoto(photoId: string) {
  const user = await requirePermission("canManageInvoices");
  await db.invoicePhoto.findFirstOrThrow({
    where: { id: photoId, invoice: { organizationId: user.effectiveOrganizationId } },
  });

  const photo = await db.invoicePhoto.delete({ where: { id: photoId } });
  await deleteUploadedFile(photo.filePath);
  revalidatePath(`/invoices/${photo.invoiceId}`);
}
