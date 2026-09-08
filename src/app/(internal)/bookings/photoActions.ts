"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteUploadedFile } from "@/lib/uploads";
import { requireUser } from "@/lib/session";

export async function uploadPhoto(
  bookingId: string,
  data: { filePath: string; mediaType: string; type: string; caption: string }
) {
  const user = await requireUser();
  await db.booking.findFirstOrThrow({
    where: { id: bookingId, organizationId: user.effectiveOrganizationId },
  });

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
  const user = await requireUser();
  await db.photo.findFirstOrThrow({
    where: { id: photoId, booking: { organizationId: user.effectiveOrganizationId } },
  });

  const photo = await db.photo.delete({ where: { id: photoId } });
  await deleteUploadedFile(photo.filePath);
  revalidatePath(`/bookings/${photo.bookingId}`);
}
