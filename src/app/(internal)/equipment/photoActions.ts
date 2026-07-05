"use server";

import { revalidatePath } from "next/cache";
import { unlink } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { saveEquipmentPhotoFile, uploadsRoot } from "@/lib/uploads";
import { str } from "@/lib/formData";

export async function uploadEquipmentPhoto(
  equipmentItemId: string,
  formData: FormData
) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A photo file is required");
  }

  const filePath = await saveEquipmentPhotoFile(equipmentItemId, file);

  await db.equipmentPhoto.create({
    data: {
      equipmentItemId,
      filePath,
      type: str(formData, "type") ?? "condition",
      caption: str(formData, "caption"),
    },
  });

  revalidatePath(`/equipment/${equipmentItemId}`);
}

export async function deleteEquipmentPhoto(photoId: string) {
  const photo = await db.equipmentPhoto.delete({ where: { id: photoId } });
  const fullPath = path.join(uploadsRoot(), photo.filePath);
  await unlink(fullPath).catch(() => {});
  revalidatePath(`/equipment/${photo.equipmentItemId}`);
}
