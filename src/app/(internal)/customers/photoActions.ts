"use server";

import { revalidatePath } from "next/cache";
import { unlink } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { saveCustomerPhotoFile, uploadsRoot } from "@/lib/uploads";
import { str } from "@/lib/formData";

export async function uploadCustomerPhoto(customerId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A photo file is required");
  }

  const filePath = await saveCustomerPhotoFile(customerId, file);

  await db.customerPhoto.create({
    data: {
      customerId,
      filePath,
      type: str(formData, "type") ?? "other",
      caption: str(formData, "caption"),
    },
  });

  revalidatePath(`/customers/${customerId}`);
}

export async function deleteCustomerPhoto(photoId: string) {
  const photo = await db.customerPhoto.delete({ where: { id: photoId } });
  const fullPath = path.join(uploadsRoot(), photo.filePath);
  await unlink(fullPath).catch(() => {});
  revalidatePath(`/customers/${photo.customerId}`);
}
