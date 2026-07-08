"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteUploadedFile } from "@/lib/uploads";

export async function uploadPhoto(
  bookingId: string,
  data: { filePath: string; mediaType: string; type: string; caption: string }
) {
  await db.photo.create({
    data: {
      bookingId,
      filePath: data.filePath,
      mediaType: data.mediaType,
      type: data.type || "other",
      caption: data.caption || null,
    },
  });

  revalidatePath(`/bookings/${bookingId}`);
}

export async function deletePhoto(photoId: string) {
  const photo = await db.photo.delete({ where: { id: photoId } });
  await deleteUploadedFile(photo.filePath);
  revalidatePath(`/bookings/${photo.bookingId}`);
}
