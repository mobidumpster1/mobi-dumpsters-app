"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { requireUser } from "@/lib/session";
import { extendBookingDates } from "@/lib/bookingExtension";
import { applyDumpWeightToBooking } from "@/lib/overageBilling";

// One-tap actions for the screens people use all day (Dispatch and the
// booking page), so a phone call ("can I keep it two more days?") or a scale
// ticket doesn't mean hunting through four other pages.

function refresh(bookingId: string, customerId?: string) {
  revalidatePath("/");
  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/invoices");
  if (customerId) revalidatePath(`/customers/${customerId}`);
}

export async function extendBooking(bookingId: string, formData: FormData) {
  const user = await requireUser();
  const booking = await extendBookingDates(
    user.effectiveOrganizationId,
    bookingId,
    Number(str(formData, "days"))
  );
  refresh(bookingId, booking.customerId);
}

// For a customer's "I want more time" request: actually extends the booking
// and then marks the request handled (before, "Mark Handled" only cleared
// the request and left the dates alone).
export async function extendForRequest(requestId: string, formData: FormData) {
  const user = await requireUser();
  const request = await db.serviceRequest.findFirstOrThrow({
    where: { id: requestId, booking: { organizationId: user.effectiveOrganizationId } },
  });
  const booking = await extendBookingDates(
    user.effectiveOrganizationId,
    request.bookingId,
    Number(str(formData, "days"))
  );
  await db.serviceRequest.update({
    where: { id: requestId },
    data: { status: "resolved", resolvedAt: new Date() },
  });
  refresh(request.bookingId, booking.customerId);
}

// Enter the scale-ticket weight straight from the booking (or the Dispatch
// "waiting on weight" list). Logs it to the customer's dump log and runs the
// same overweight billing/texting as the Dump Log tab.
export async function logBookingWeight(bookingId: string, formData: FormData) {
  const user = await requireUser();
  const weightTons = Number(str(formData, "weightTons"));
  if (!Number.isFinite(weightTons) || weightTons <= 0 || weightTons > 100) {
    throw new Error("Enter the weight in tons (greater than 0)");
  }
  const feeRaw = str(formData, "fee");
  const fee = feeRaw ? Number(feeRaw) : 0;
  if (!Number.isFinite(fee) || fee < 0) throw new Error("Enter a valid dump fee");
  const itemId = str(formData, "itemId") || undefined;

  const booking = await db.booking.findFirstOrThrow({
    where: { id: bookingId, organizationId: user.effectiveOrganizationId },
    include: { customer: true },
  });

  await db.dumpLogEntry.create({
    data: {
      customerId: booking.customerId,
      bookingId,
      date: new Date(),
      weightTons,
      fee,
      notes: "Entered from the booking",
      receiptUrl: "",
    },
  });
  await applyDumpWeightToBooking(user.effectiveOrganizationId, booking.customer, bookingId, weightTons, itemId);
  refresh(bookingId, booking.customerId);
}
