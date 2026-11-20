"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { requireUser, hasPermission } from "@/lib/session";
import { invoiceIsSettled, nextInvoiceNumber, primaryInvoiceWhere } from "@/lib/invoicing";

export async function addDamageReport(bookingId: string, formData: FormData) {
  const user = await requireUser();
  await db.booking.findFirstOrThrow({
    where: { id: bookingId, organizationId: user.effectiveOrganizationId },
  });

  const equipmentItemId = str(formData, "equipmentItemId");
  const description = str(formData, "description");
  const estimatedCostStr = str(formData, "estimatedCost");
  const billedToCustomer = formData.get("billedToCustomer") === "on";

  if (!equipmentItemId) throw new Error("Select which piece of equipment was damaged");
  if (!description) throw new Error("A description is required");
  if (!estimatedCostStr) throw new Error("An estimated cost is required");
  const estimatedCost = Number(estimatedCostStr);

  const equipmentItem = await db.equipmentItem.findFirstOrThrow({
    where: { id: equipmentItemId, organizationId: user.effectiveOrganizationId },
  });

  let invoiceLineItemId: string | null = null;
  let expenseId: string | null = null;

  if (billedToCustomer) {
    // Billing a customer needs the same permission as editing an invoice.
    if (!hasPermission(user, "canManageInvoices")) {
      throw new Error("You don't have permission to bill a customer. Ask the owner to add the charge.");
    }
    const invoice = await db.invoice.findFirst({
      where: primaryInvoiceWhere(user.effectiveOrganizationId, bookingId),
      orderBy: { createdAt: "asc" },
      include: { installments: true },
    });
    if (!invoice) {
      throw new Error(
        "This booking doesn't have an invoice yet — create one first, then bill the damage to it."
      );
    }
    const lineDescription = `Damage — ${equipmentItem.label}: ${description}`;

    if (invoiceIsSettled(invoice)) {
      // The rental invoice is paid, part-paid or on a payment plan: raising its
      // total would leave it looking paid when nothing was collected for the
      // damage, and move the refund ceiling above what Stripe actually holds.
      // The damage goes on its own invoice, due now.
      const supplemental = await db.invoice.create({
        data: {
          organizationId: user.effectiveOrganizationId,
          bookingId,
          customerId: invoice.customerId,
          invoiceNumber: await nextInvoiceNumber(user.effectiveOrganizationId),
          amount: estimatedCost,
          status: "unpaid",
          source: "supplemental",
          notes: `Damage charge added after ${invoice.invoiceNumber} was settled.`,
          lineItems: { create: [{ description: lineDescription, amount: estimatedCost, type: "damage" }] },
        },
        include: { lineItems: true },
      });
      invoiceLineItemId = supplemental.lineItems[0].id;
    } else {
      invoiceLineItemId = await db.$transaction(async (tx) => {
        const lineItem = await tx.invoiceLineItem.create({
          data: { invoiceId: invoice.id, description: lineDescription, amount: estimatedCost, type: "damage" },
        });
        await tx.invoice.update({ where: { id: invoice.id }, data: { amount: { increment: estimatedCost } } });
        return lineItem.id;
      });
    }
  } else {
    const expense = await db.expense.create({
      data: {
        organizationId: user.effectiveOrganizationId,
        vendor: "Repair",
        category: "Repairs",
        amount: estimatedCost,
        date: new Date(),
        notes: `${equipmentItem.label}: ${description}`,
        bookingId,
        equipmentItemId,
      },
    });
    expenseId = expense.id;
  }

  await db.damageReport.create({
    data: {
      bookingId,
      equipmentItemId,
      description,
      estimatedCost,
      billedToCustomer,
      invoiceLineItemId,
      expenseId,
    },
  });

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/invoices");
  revalidatePath("/expenses");
}

export async function deleteDamageReport(damageReportId: string) {
  const user = await requireUser();
  const report = await db.damageReport.findFirstOrThrow({
    where: { id: damageReportId, booking: { organizationId: user.effectiveOrganizationId } },
  });

  if (report.invoiceLineItemId) {
    const lineItem = await db.invoiceLineItem.findUnique({
      where: { id: report.invoiceLineItemId },
      include: { invoice: { include: { installments: true, lineItems: true } } },
    });
    if (lineItem) {
      const invoice = lineItem.invoice;
      // Taking a charge off an invoice that has been paid, part-paid or put on a
      // plan would erase money that was really collected. Settle it properly
      // (refund or adjust the invoice) instead.
      if (invoiceIsSettled(invoice)) {
        throw new Error(
          `This damage charge is on invoice ${invoice.invoiceNumber}, which has been paid or is on a payment plan, so it can't be deleted. Refund or adjust that invoice instead.`
        );
      }
      await db.$transaction(async (tx) => {
        await tx.invoiceLineItem.delete({ where: { id: lineItem.id } });
        const onlyLine = invoice.source === "supplemental" && invoice.lineItems.length === 1;
        if (onlyLine) {
          await tx.invoice.delete({ where: { id: invoice.id } });
        } else {
          await tx.invoice.update({ where: { id: invoice.id }, data: { amount: { decrement: lineItem.amount } } });
        }
      });
    }
  }

  if (report.expenseId) {
    const expense = await db.expense.findFirst({
      where: { id: report.expenseId, organizationId: user.effectiveOrganizationId },
      select: { status: true },
    });
    // A paid repair expense is real payment history (and may be in QuickBooks);
    // only an unpaid one can be removed along with the report.
    if (expense && expense.status !== "unpaid") {
      throw new Error("The repair expense for this damage report has been marked paid, so the report can't be deleted. Mark the expense unpaid first.");
    }
    await db.expense.deleteMany({ where: { id: report.expenseId, organizationId: user.effectiveOrganizationId } });
  }

  await db.damageReport.delete({ where: { id: damageReportId } });

  revalidatePath(`/bookings/${report.bookingId}`);
  revalidatePath("/invoices");
  revalidatePath("/expenses");
}
