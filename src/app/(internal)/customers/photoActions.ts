"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteUploadedFile } from "@/lib/uploads";

export async function uploadCustomerPhoto(
  customerId: string,
  data: { filePath: string; mediaType: string; type: string; caption: string }
) {
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
  const photo = await db.customerPhoto.delete({ where: { id: photoId } });
  await deleteUploadedFile(photo.filePath);
  revalidatePath(`/customers/${photo.customerId}`);
}
