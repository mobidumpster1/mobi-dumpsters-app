"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteUploadedFile } from "@/lib/uploads";

export async function uploadGalleryPhoto(data: {
  filePath: string;
  mediaType: string;
  type: string;
  caption: string;
}) {
  await db.galleryPhoto.create({
    data: {
      filePath: data.filePath,
      mediaType: data.mediaType,
      caption: data.caption || null,
    },
  });

  revalidatePath("/gallery");
}

export async function deleteGalleryPhoto(photoId: string) {
  const photo = await db.galleryPhoto.delete({ where: { id: photoId } });
  await deleteUploadedFile(photo.filePath);
  revalidatePath("/gallery");
}
