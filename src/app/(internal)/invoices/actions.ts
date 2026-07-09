"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { pushInvoicePayment, createOnlinePaymentLink, getQboInvoiceBalance } from "@/lib/quickbooks";
import { computeInvoiceLineItems } from "@/lib/invoicing";
import { sendCustomerEmail } from "@/lib/email";
import { branding } from "@/lib/branding";
import { requirePermission } from "@/lib/session";
import { logAction } from "@/lib/auditLog";

export async function createInvoice(formData: FormData) {
  await requirePermission("canManageInvoices");
  const bookingId = str(formData, "bookingId");
  const invoiceNumber = str(formData, "invoiceNumber");
  const issueDateStr = str(formData, "issueDate");
  if (!bookingId) throw new Error("Booking is required");
  if (!invoiceNumber) throw new Error("Invoice number is required");

  const dueDateStr = str(formData, "dueDate");

  const booking = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: {
      items: { include: { equipmentItem: { include: { category: true } } } },
    },
  });
  const lines = computeInvoiceLineItems(booking.items);
  const amount = lines.reduce((sum, line) => sum + line.amount, 0);

  const invoice = await db.invoice.create({
    data: {
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
  await requirePermission("canManageInvoices");

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
  await requirePermission("canManageInvoices");

  await db.invoice.update({
    where: { id: invoiceId },
    data: { status: "unpaid", paidDate: null, paymentMethod: null },
  });
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function deleteInvoice(invoiceId: string) {
  await requirePermission("canDeleteRecords");

  await db.invoiceLineItem.deleteMany({ where: { invoiceId } });
  await db.invoice.delete({ where: { id: invoiceId } });
  await logAction("invoice.deleted", "Invoice", invoiceId);
  revalidatePath("/invoices");
  redirect("/invoices");
}

// Sends (or resends) a QuickBooks-hosted "pay this invoice online" link to
// the customer. No card data ever touches this app — Intuit's page handles
// the actual charge, requiring QuickBooks Payments to already be enabled on
// the connected company.
export async function sendInvoiceForOnlinePayment(invoiceId: string) {
  await requirePermission("canManageInvoices");

  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: {
      booking: { include: { customer: true } },
      customer: true,
      lineItems: true,
    },
  });

  const customer = invoice.booking?.customer ?? invoice.customer;
  if (!customer?.email) {
    throw new Error(
      "This customer has no email on file — add one before sending an online payment link."
    );
  }

  const result = await createOnlinePaymentLink({
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
    description: invoice.lineItems.map((l) => l.description).join(", ") || invoice.invoiceNumber,
    billEmail: customer.email,
    existingQboInvoiceId: invoice.quickbooksInvoiceId,
  });

  if (!result) {
    throw new Error("Connect QuickBooks in Settings before sending online payment links.");
  }

  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      quickbooksInvoiceId: result.qboInvoiceId,
      onlinePaymentUrl: result.invoiceLink,
      onlinePaymentSentAt: new Date(),
    },
  });

  await sendCustomerEmail(
    customer.email,
    `Pay your invoice ${invoice.invoiceNumber} online`,
    [
      `Hi ${customer.name},`,
      "",
      `You can pay invoice ${invoice.invoiceNumber} ($${invoice.amount.toFixed(2)}) online here:`,
      "",
      result.invoiceLink,
      "",
      `Thanks,`,
      `- ${branding.businessName}`,
    ].join("\n")
  );

  revalidatePath(`/invoices/${invoiceId}`);
}

// Manually checks QuickBooks for whether the customer has paid the hosted
// online invoice yet, marking it paid locally if so. Also run
// best-effort whenever the invoice page loads (see page.tsx).
export async function checkOnlinePaymentStatus(invoiceId: string) {
  const invoice = await db.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (invoice.quickbooksInvoiceId && invoice.status !== "paid") {
    const balance = await getQboInvoiceBalance(invoice.quickbooksInvoiceId);
    if (balance === 0) {
      await db.invoice.update({
        where: { id: invoiceId },
        data: { status: "paid", paidDate: new Date(), paymentMethod: "QuickBooks Payments (online)" },
      });
    }
  }
  revalidatePath(`/invoices/${invoiceId}`);
}
