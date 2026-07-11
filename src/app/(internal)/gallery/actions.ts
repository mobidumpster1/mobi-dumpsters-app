"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteUploadedFile } from "@/lib/uploads";
import { requireUser } from "@/lib/session";

export async function uploadGalleryPhoto(data: {
  filePath: string;
  mediaType: string;
  type: string;
  caption: string;
}) {
  const user = await requireUser();
  await db.galleryPhoto.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      filePath: data.filePath,
      mediaType: data.mediaType,
      caption: data.caption || null,
    },
  });

  revalidatePath("/gallery");
}

export async function deleteGalleryPhoto(photoId: string) {
  const user = await requireUser();
  await db.galleryPhoto.findFirstOrThrow({
    where: { id: photoId, organizationId: user.effectiveOrganizationId },
  });
  const photo = await db.galleryPhoto.delete({ where: { id: photoId } });
  await deleteUploadedFile(photo.filePath);
  revalidatePath("/gallery");
}
