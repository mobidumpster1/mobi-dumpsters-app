"use server";

import { revalidatePath } from "next/cache";
import { unlink } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { savePhotoFile, uploadsRoot } from "@/lib/uploads";
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
  const fullPath = path.join(uploadsRoot(), photo.filePath);
  await unlink(fullPath).catch(() => {});
  revalidatePath(`/bookings/${photo.bookingId}`);
}
