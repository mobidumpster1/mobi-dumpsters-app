"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { saveCustomerPhotoFile, deleteUploadedFile } from "@/lib/uploads";
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
  await deleteUploadedFile(photo.filePath);
  revalidatePath(`/customers/${photo.customerId}`);
}
