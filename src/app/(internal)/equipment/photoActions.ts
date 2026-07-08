"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteUploadedFile } from "@/lib/uploads";

export async function uploadEquipmentPhoto(
  equipmentItemId: string,
  data: { filePath: string; mediaType: string; type: string; caption: string }
) {
  await db.equipmentPhoto.create({
    data: {
      equipmentItemId,
      filePath: data.filePath,
      mediaType: data.mediaType,
      type: data.type || "condition",
      caption: data.caption || null,
    },
  });

  revalidatePath(`/equipment/${equipmentItemId}`);
}

export async function deleteEquipmentPhoto(photoId: string) {
  const photo = await db.equipmentPhoto.delete({ where: { id: photoId } });
  await deleteUploadedFile(photo.filePath);
  revalidatePath(`/equipment/${photo.equipmentItemId}`);
}
