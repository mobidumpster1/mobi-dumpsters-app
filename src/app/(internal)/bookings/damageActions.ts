"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { requireUser } from "@/lib/session";

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
    const invoice = await db.invoice.findFirst({ where: { bookingId } });
    if (!invoice) {
      throw new Error(
        "This booking doesn't have an invoice yet — create one first, then bill the damage to it."
      );
    }
    const lineItem = await db.invoiceLineItem.create({
      data: {
        invoiceId: invoice.id,
        description: `Damage — ${equipmentItem.label}: ${description}`,
        amount: estimatedCost,
        type: "damage",
      },
    });
    await db.invoice.update({
      where: { id: invoice.id },
      data: { amount: invoice.amount + estimatedCost },
    });
    invoiceLineItemId = lineItem.id;
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
    });
    if (lineItem) {
      await db.invoice.update({
        where: { id: lineItem.invoiceId },
        data: { amount: { decrement: lineItem.amount } },
      });
      await db.invoiceLineItem.delete({ where: { id: lineItem.id } });
    }
  }

  if (report.expenseId) {
    await db.expense.delete({ where: { id: report.expenseId } }).catch(() => {});
  }

  await db.damageReport.delete({ where: { id: damageReportId } });

  revalidatePath(`/bookings/${report.bookingId}`);
  revalidatePath("/invoices");
  revalidatePath("/expenses");
}
