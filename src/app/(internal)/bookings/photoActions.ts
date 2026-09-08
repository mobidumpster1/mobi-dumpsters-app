"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { deleteUploadedFile } from "@/lib/uploads";
import { requireUser } from "@/lib/session";
import { getJobPhotoNotificationSettings, sendJobPhotoNotification } from "@/lib/jobPhotoNotifications";

const NOTIFIABLE_TYPES = new Set(["delivery", "pickup"]);

export async function uploadPhoto(
  bookingId: string,
  data: { filePath: string; mediaType: string; type: string; caption: string }
) {
  const user = await requireUser();
  await db.booking.findFirstOrThrow({
    where: { id: bookingId, organizationId: user.effectiveOrganizationId },
  });

  const type = data.type || "other";
  await db.photo.create({
    data: {
      bookingId,
      filePath: data.filePath,
      mediaType: data.mediaType,
      type,
      caption: data.caption || null,
    },
  });

  if (NOTIFIABLE_TYPES.has(type)) {
    const settings = await getJobPhotoNotificationSettings(user.effectiveOrganizationId);
    if (settings.autoSend) {
      // Best-effort — a failed auto-send (no email/phone on file, Twilio
      // not connected, etc.) shouldn't undo the upload that already
      // succeeded. Staff can still send it manually from the booking page.
      await sendJobPhotoNotification(bookingId, type as "delivery" | "pickup", data.filePath).catch(
        () => {}
      );
    }
  }

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

// Manual send — grabs whichever delivery/pickup photo was uploaded most
// recently for this booking, so there's nothing extra to pick.
export async function sendPhotoNotificationNow(bookingId: string, type: "delivery" | "pickup") {
  const user = await requireUser();
  await db.booking.findFirstOrThrow({
    where: { id: bookingId, organizationId: user.effectiveOrganizationId },
  });

  const photo = await db.photo.findFirst({
    where: { bookingId, type },
    orderBy: { createdAt: "desc" },
  });
  if (!photo) {
    throw new Error(`No ${type} photo uploaded yet — add one first.`);
  }

  const result = await sendJobPhotoNotification(bookingId, type, photo.filePath);
  if (!result.sent) {
    throw new Error(result.error ?? "Couldn't send that notification.");
  }
}
