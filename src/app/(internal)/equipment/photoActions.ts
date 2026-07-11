"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteUploadedFile } from "@/lib/uploads";
import { requireUser } from "@/lib/session";

export async function uploadEquipmentPhoto(
  equipmentItemId: string,
  data: { filePath: string; mediaType: string; type: string; caption: string }
) {
  const user = await requireUser();
  await db.equipmentItem.findFirstOrThrow({
    where: { id: equipmentItemId, organizationId: user.effectiveOrganizationId },
  });

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
  const user = await requireUser();
  await db.equipmentPhoto.findFirstOrThrow({
    where: { id: photoId, equipmentItem: { organizationId: user.effectiveOrganizationId } },
  });
  const photo = await db.equipmentPhoto.delete({ where: { id: photoId } });
  await deleteUploadedFile(photo.filePath);
  revalidatePath(`/equipment/${photo.equipmentItemId}`);
}
