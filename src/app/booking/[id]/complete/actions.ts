"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { getAgreementSettings } from "@/lib/agreement";
import { createDraftInvoiceForBooking } from "@/lib/invoicing";
import { createCheckoutSession, toCents } from "@/lib/stripe";
import { siteOrigin } from "@/lib/email";

// Public — reached only via the unguessable booking id a staff member
// copies and sends themselves (same trust model as /booking/[id]/manage).
// Lets a customer who was booked over the phone finish the two things
// only they can actually do: sign for real, and pay with their own card.
export async function completeBookingSigning(bookingId: string, formData: FormData) {
  const booking = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { customer: true },
  });

  const signerName = str(formData, "signerName");
  const signatureUrl = str(formData, "signatureUrl");
  const emailInput = str(formData, "email");
  if (!signerName) throw new Error("Name is required");
  if (!signatureUrl) throw new Error("A signature is required");
  if (!booking.customer.email && !emailInput) {
    throw new Error("Email is required so we can send you a receipt");
  }

  // Filling this in here (rather than requiring staff to have it upfront)
  // is the whole point — a phone booking often starts with no email on
  // file, and this is the first moment the customer supplies it themselves.
  if (emailInput && emailInput !== booking.customer.email) {
    await db.customer.update({ where: { id: booking.customerId }, data: { email: emailInput } });
  }
  const customerEmail = emailInput || booking.customer.email!;

  const agreement = await getAgreementSettings(booking.organizationId);
  const headerList = await headers();
  const ipAddress =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    null;

  await db.signedAgreement.create({
    data: {
      agreementTitle: agreement.title,
      agreementText: agreement.content,
      signerName,
      signerEmail: customerEmail,
      signerPhone: booking.customer.phone,
      signerAddress: booking.customer.address ?? booking.deliveryAddress,
      ipAddress,
      signatureUrl,
      customerId: booking.customerId,
      bookingId: booking.id,
    },
  });

  redirect(await nextStepUrl(booking.id, booking.organizationId, booking.customer, customerEmail));
}

// Also used to jump straight to payment on a repeat visit, after the
// agreement's already been signed.
export async function payForBooking(bookingId: string) {
  const booking = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { customer: true },
  });
  if (!booking.customer.email) {
    throw new Error("Sign the agreement first — that's where we get your email.");
  }
  redirect(
    await nextStepUrl(booking.id, booking.organizationId, booking.customer, booking.customer.email)
  );
}

async function nextStepUrl(
  bookingId: string,
  organizationId: string,
  customer: { id: string; name: string; stripeCustomerId: string | null },
  email: string
): Promise<string> {
  const invoice = await createDraftInvoiceForBooking(bookingId);

  if (invoice.status === "paid" || invoice.amount <= 0) {
    return `/booking/${bookingId}/complete?done=1`;
  }

  const result = await createCheckoutSession(
    organizationId,
    { id: customer.id, name: customer.name, email, stripeCustomerId: customer.stripeCustomerId },
    toCents(invoice.amount),
    `Booking payment`,
    `${siteOrigin()}/booking/${bookingId}/complete?done=1`,
    `${siteOrigin()}/booking/${bookingId}/complete?signed=1`,
    { invoiceId: invoice.id }
  );

  // Stripe isn't connected for this business — the signature is still
  // saved either way; payment just gets collected some other way (a call,
  // an invoice link sent separately, cash/check on delivery).
  return result ? result.url : `/booking/${bookingId}/complete?signed=1&nopay=1`;
}
