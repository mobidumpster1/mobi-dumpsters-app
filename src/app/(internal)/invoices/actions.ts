"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { pushInvoicePayment } from "@/lib/quickbooks";
import { computeInvoiceLineItems, markInvoicePaidViaStripe } from "@/lib/invoicing";
import { chargeCardOnFile, createCheckoutSession, toCents } from "@/lib/stripe";
import { sendCustomerEmail, siteOrigin } from "@/lib/email";
import { branding } from "@/lib/branding";
import { requirePermission } from "@/lib/session";
import { logAction } from "@/lib/auditLog";

export async function createInvoice(formData: FormData) {
  const user = await requirePermission("canManageInvoices");
  const bookingId = str(formData, "bookingId");
  const invoiceNumber = str(formData, "invoiceNumber");
  const issueDateStr = str(formData, "issueDate");
  if (!bookingId) throw new Error("Booking is required");
  if (!invoiceNumber) throw new Error("Invoice number is required");

  const dueDateStr = str(formData, "dueDate");

  const booking = await db.booking.findFirstOrThrow({
    where: { id: bookingId, organizationId: user.effectiveOrganizationId },
    include: {
      items: { include: { equipmentItem: { include: { category: true } } } },
    },
  });
  const lines = computeInvoiceLineItems(booking.items);
  const amount = lines.reduce((sum, line) => sum + line.amount, 0);

  const invoice = await db.invoice.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      bookingId,
      invoiceNumber,
      issueDate: issueDateStr ? new Date(issueDateStr) : new Date(),
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
      amount,
      notes: str(formData, "notes"),
      status: "unpaid",
      lineItems: { create: lines },
    },
  });

  redirect(`/invoices/${invoice.id}`);
}

export async function markPaid(invoiceId: string, formData: FormData) {
  const user = await requirePermission("canManageInvoices");

  await db.invoice.findFirstOrThrow({
    where: { id: invoiceId, organizationId: user.effectiveOrganizationId },
  });

  const invoice = await db.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "paid",
      paidDate: new Date(),
      paymentMethod: str(formData, "paymentMethod"),
    },
    include: {
      booking: {
        include: { customer: true, items: { include: { equipmentItem: true } } },
      },
      customer: true,
    },
  });

  const customer = invoice.booking?.customer ?? invoice.customer;

  if (customer) {
    try {
      const result = await pushInvoicePayment({
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          quickbooksCustomerId: customer.quickbooksCustomerId,
        },
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        issueDate: invoice.issueDate,
        description:
          invoice.booking?.items
            .map((item) => item.equipmentItem.label)
            .join(", ") ?? invoice.invoiceNumber,
        existingQboInvoiceId: invoice.quickbooksInvoiceId,
        organizationId: user.effectiveOrganizationId,
      });

      if (result) {
        await db.invoice.update({
          where: { id: invoiceId },
          data: {
            quickbooksInvoiceId: result.invoiceId,
            quickbooksPaymentId: result.paymentId,
          },
        });
      }
    } catch (error) {
      // A QuickBooks hiccup shouldn't block marking the invoice paid locally.
      console.error("Failed to push invoice to QuickBooks:", error);
    }
  }

  await logAction("invoice.marked_paid", "Invoice", invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function markUnpaid(invoiceId: string) {
  const user = await requirePermission("canManageInvoices");

  await db.invoice.updateMany({
    where: { id: invoiceId, organizationId: user.effectiveOrganizationId },
    data: { status: "unpaid", paidDate: null, paymentMethod: null },
  });
  await logAction("invoice.marked_unpaid", "Invoice", invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function deleteInvoice(invoiceId: string) {
  const user = await requirePermission("canDeleteRecords");

  await db.invoice.findFirstOrThrow({
    where: { id: invoiceId, organizationId: user.effectiveOrganizationId },
  });

  await db.invoiceLineItem.deleteMany({ where: { invoiceId } });
  await db.invoice.delete({ where: { id: invoiceId } });
  await logAction("invoice.deleted", "Invoice", invoiceId);
  revalidatePath("/invoices");
  redirect("/invoices");
}

// Charges the customer's card on file directly — no customer interaction
// needed, no link to send. This is the primary path once a card is on
// file; the Stripe webhook (payment_intent.succeeded) is a backstop for
// the rare case this call succeeds on Stripe's side but never finishes
// here (server crash, etc).
export async function chargeInvoiceViaStripe(invoiceId: string) {
  const user = await requirePermission("canManageInvoices");

  const invoice = await db.invoice.findFirstOrThrow({
    where: { id: invoiceId, organizationId: user.effectiveOrganizationId },
    include: {
      booking: { include: { customer: true } },
      customer: true,
    },
  });

  const customer = invoice.booking?.customer ?? invoice.customer;
  if (!customer) {
    throw new Error("This invoice has no customer to charge.");
  }

  const { paymentIntentId } = await chargeCardOnFile(
    user.effectiveOrganizationId,
    { stripeCustomerId: customer.stripeCustomerId, stripePaymentMethodId: customer.stripePaymentMethodId },
    toCents(invoice.amount),
    `Invoice ${invoice.invoiceNumber}`,
    { invoiceId: invoice.id }
  );

  await markInvoicePaidViaStripe(invoice.id, user.effectiveOrganizationId, paymentIntentId);
  await logAction("invoice.charged_stripe", "Invoice", invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
}

// Fallback for a customer without a saved card yet — emails a
// Stripe-hosted payment link. Completing it also saves the card
// (setup_future_usage, see createCheckoutSession) so next time this
// customer can just be charged directly instead.
export async function sendInvoiceCheckoutLink(invoiceId: string) {
  const user = await requirePermission("canManageInvoices");

  const invoice = await db.invoice.findFirstOrThrow({
    where: { id: invoiceId, organizationId: user.effectiveOrganizationId },
    include: {
      booking: { include: { customer: true } },
      customer: true,
    },
  });

  const customer = invoice.booking?.customer ?? invoice.customer;
  if (!customer?.email) {
    throw new Error(
      "This customer has no email on file — add one before sending a payment link."
    );
  }

  const result = await createCheckoutSession(
    user.effectiveOrganizationId,
    { id: customer.id, name: customer.name, email: customer.email, stripeCustomerId: customer.stripeCustomerId },
    toCents(invoice.amount),
    `Invoice ${invoice.invoiceNumber}`,
    `${siteOrigin()}/invoices/${invoiceId}`,
    `${siteOrigin()}/invoices/${invoiceId}`,
    { invoiceId: invoice.id }
  );

  if (!result) {
    throw new Error("Connect Stripe in Settings before sending payment links.");
  }

  await sendCustomerEmail(
    customer.email,
    `Pay your invoice ${invoice.invoiceNumber} online`,
    [
      `Hi ${customer.name},`,
      "",
      `You can pay invoice ${invoice.invoiceNumber} ($${invoice.amount.toFixed(2)}) online here:`,
      "",
      result.url,
      "",
      `Thanks,`,
      `- ${branding.businessName}`,
    ].join("\n")
  );

  revalidatePath(`/invoices/${invoiceId}`);
}
