"use server";

import { db } from "@/lib/db";
import { sendNotificationEmail } from "@/lib/email";

// Public, unauthenticated — reached from the link a customer/lead is
// texted or emailed. No session exists here, so nothing is audit-logged
// via logAction (it silently no-ops with no user anyway); a CustomerNote
// is written instead once a real Customer exists, same "leave a trail for
// an action nobody was logged in for" pattern submitBookingRequest uses.
export async function acceptQuote(publicToken: string, selectedOptionalLineItemIds: string[] = []) {
  const quote = await db.quote.findUnique({
    where: { publicToken },
    include: { lead: true, customer: true, lineItems: true },
  });
  if (!quote) throw new Error("This quote link isn't valid.");
  if (quote.status !== "sent") {
    throw new Error("This quote has already been responded to.");
  }

  const validOptionalIds = new Set(
    quote.lineItems.filter((line) => line.optional).map((line) => line.id)
  );
  const selectedOptionalIds = new Set(
    selectedOptionalLineItemIds.filter((id) => validOptionalIds.has(id))
  );
  const effectiveLineItems = quote.lineItems.filter(
    (line) => !line.optional || selectedOptionalIds.has(line.id)
  );
  const acceptedAmount = effectiveLineItems.reduce(
    (sum, line) => sum + line.amount * line.quantity,
    0
  );

  let customer = quote.customer;
  if (!customer && quote.lead) {
    customer = await db.customer.create({
      data: {
        organizationId: quote.organizationId,
        name: quote.lead.name,
        phone: quote.lead.phone,
        email: quote.lead.email,
        address: quote.lead.address,
        latitude: quote.lead.latitude,
        longitude: quote.lead.longitude,
        leadSource: quote.lead.source,
      },
    });
    await db.lead.update({
      where: { id: quote.lead.id },
      data: { status: "customer", customerId: customer.id },
    });
  }
  if (!customer) {
    throw new Error("This quote has no customer or lead on file — contact us directly.");
  }

  const lineItemsSummary = effectiveLineItems
    .map((line) => `${line.description} x${line.quantity} — $${line.amount.toFixed(2)}`)
    .join("\n");

  const booking = await db.booking.create({
    data: {
      organizationId: quote.organizationId,
      customerId: customer.id,
      deliveryAddress: customer.address ?? "",
      status: "pending",
      notes: [
        `Accepted from quote ${quote.quoteNumber}:`,
        lineItemsSummary,
        quote.notes ? `Notes: ${quote.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    },
  });

  await db.quote.update({
    where: { id: quote.id },
    data: {
      status: "accepted",
      respondedAt: new Date(),
      customerId: customer.id,
      bookingId: booking.id,
      acceptedAmount,
    },
  });

  await db.customerNote.create({
    data: {
      customerId: customer.id,
      type: "note",
      content: `Accepted quote ${quote.quoteNumber} online ($${acceptedAmount.toFixed(2)}).`,
    },
  });

  await sendNotificationEmail(
    `Quote ${quote.quoteNumber} accepted`,
    [
      `${customer.name} accepted quote ${quote.quoteNumber} ($${acceptedAmount.toFixed(2)}).`,
      "",
      "It's landed in your pending bookings for review — open the app to confirm real dates and equipment.",
    ].join("\n")
  );
}

export async function declineQuote(publicToken: string) {
  const quote = await db.quote.findUnique({ where: { publicToken }, include: { lead: true } });
  if (!quote) throw new Error("This quote link isn't valid.");
  if (quote.status !== "sent") {
    throw new Error("This quote has already been responded to.");
  }

  await db.quote.update({
    where: { id: quote.id },
    data: { status: "declined", respondedAt: new Date() },
  });

  // Don't clobber a status staff already changed by hand since the quote
  // was sent.
  if (quote.lead && quote.lead.status === "quoted") {
    await db.lead.update({ where: { id: quote.lead.id }, data: { status: "not_interested" } });
  }
}
