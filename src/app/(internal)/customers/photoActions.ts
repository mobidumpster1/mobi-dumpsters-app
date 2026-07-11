"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteUploadedFile } from "@/lib/uploads";
import { requireUser } from "@/lib/session";

export async function uploadCustomerPhoto(
  customerId: string,
  data: { filePath: string; mediaType: string; type: string; caption: string }
) {
  const user = await requireUser();
  await db.customer.findFirstOrThrow({
    where: { id: customerId, organizationId: user.effectiveOrganizationId },
  });

  await db.customerPhoto.create({
    data: {
      customerId,
      filePath: data.filePath,
      mediaType: data.mediaType,
      type: data.type || "other",
      caption: data.caption || null,
    },
  });

  revalidatePath(`/customers/${customerId}`);
}

export async function deleteCustomerPhoto(photoId: string) {
  const user = await requireUser();
  await db.customerPhoto.findFirstOrThrow({
    where: { id: photoId, customer: { organizationId: user.effectiveOrganizationId } },
  });
  const photo = await db.customerPhoto.delete({ where: { id: photoId } });
  await deleteUploadedFile(photo.filePath);
  revalidatePath(`/customers/${photo.customerId}`);
}
