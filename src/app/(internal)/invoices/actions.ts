"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { pushInvoicePayment } from "@/lib/quickbooks";
import { computeInvoiceLineItems } from "@/lib/invoicing";

export async function createInvoice(formData: FormData) {
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

  revalidatePath(`/invoices/${invoiceId}`);
}

export async function markUnpaid(invoiceId: string) {
  await db.invoice.update({
    where: { id: invoiceId },
    data: { status: "unpaid", paidDate: null, paymentMethod: null },
  });
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function deleteInvoice(invoiceId: string) {
  await db.invoiceLineItem.deleteMany({ where: { invoiceId } });
  await db.invoice.delete({ where: { id: invoiceId } });
  revalidatePath("/invoices");
  redirect("/invoices");
}
