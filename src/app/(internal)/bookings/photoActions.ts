"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { savePhotoFile, deleteUploadedFile } from "@/lib/uploads";
import { str } from "@/lib/formData";

export async function uploadPhoto(bookingId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A photo file is required");
  }

  const filePath = await savePhotoFile(bookingId, file);

  await db.photo.create({
    data: {
      bookingId,
      filePath,
      type: str(formData, "type") ?? "other",
      caption: str(formData, "caption"),
    },
  });

  revalidatePath(`/bookings/${bookingId}`);
}

export async function deletePhoto(photoId: string) {
  const photo = await db.photo.delete({ where: { id: photoId } });
  await deleteUploadedFile(photo.filePath);
  revalidatePath(`/bookings/${photo.bookingId}`);
}
