"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { sendNotificationEmail } from "@/lib/email";

export async function requestExtension(bookingId: string, formData: FormData) {
  const newDate = str(formData, "newDate");
  const note = str(formData, "note");
  if (!newDate) throw new Error("Please choose the date you'd like to keep it until");

  const booking = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { customer: true },
  });

  const details = [`Requested new end date: ${newDate}`, note ? `Note: ${note}` : null]
    .filter(Boolean)
    .join(" — ");

  await db.serviceRequest.create({
    data: { bookingId, type: "extension", details },
  });

  await sendNotificationEmail(
    `Extension request from ${booking.customer.name}`,
    [
      `${booking.customer.name} requested more time on their rental at ${booking.deliveryAddress}.`,
      "",
      details,
      "",
      "Open the app's Bookings page to review.",
    ].join("\n")
  );

  redirect(`/booking/${bookingId}/manage?requested=extension`);
}

export async function requestDumpAndReturn(bookingId: string, formData: FormData) {
  const note = str(formData, "note");

  const booking = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { customer: true },
  });

  await db.serviceRequest.create({
    data: { bookingId, type: "dump_and_return", details: note },
  });

  await sendNotificationEmail(
    `Dump & return request from ${booking.customer.name}`,
    [
      `${booking.customer.name} asked to have their unit emptied and brought back to ${booking.deliveryAddress}, instead of a final pickup.`,
      "",
      note ? `Note: ${note}` : "",
      "",
      "Open the app's Bookings page to review.",
    ]
      .filter(Boolean)
      .join("\n")
  );

  redirect(`/booking/${bookingId}/manage?requested=dump`);
}
