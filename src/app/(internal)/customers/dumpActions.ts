"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { scanDumpReceiptImage, isReceiptScanConfigured } from "@/lib/receiptScan";
import { saveDumpReceiptFile } from "@/lib/uploads";
import { requireUser } from "@/lib/session";
import { sendCustomerSms } from "@/lib/twilio";
import { branding } from "@/lib/branding";
import { getTaxSettings } from "@/lib/taxSettings";

export async function addDumpLogEntry(customerId: string, formData: FormData) {
  const user = await requireUser();
  const dateStr = str(formData, "date");
  const weightTonsStr = str(formData, "weightTons");
  const feeStr = str(formData, "fee");
  const bookingId = str(formData, "bookingId");
  const notes = str(formData, "notes");
  const receiptUrl = str(formData, "receiptUrl");

  if (!dateStr) throw new Error("Date is required");
  if (!weightTonsStr) throw new Error("Weight is required");
  if (!feeStr) throw new Error("Fee is required");

  const weightTons = Number(weightTonsStr);
  const fee = Number(feeStr);
  if (!Number.isFinite(weightTons) || weightTons <= 0) throw new Error("Enter a weight greater than 0");
  if (!Number.isFinite(fee) || fee < 0) throw new Error("Enter a valid fee");

  const customer = await db.customer.findFirstOrThrow({
    where: { id: customerId, organizationId: user.effectiveOrganizationId },
  });

  if (bookingId) {
    // Otherwise a booking id belonging to someone else could be used here,
    // writing that booking's weight and texting this entry's customer.
    await db.booking.findFirstOrThrow({
      where: { id: bookingId, customerId, organizationId: user.effectiveOrganizationId },
    });
  }

  await db.dumpLogEntry.create({
    data: {
      customerId,
      bookingId: bookingId || null,
      date: new Date(dateStr),
      weightTons,
      fee,
      notes,
      receiptUrl,
    },
  });

  if (bookingId) {
    await applyDumpWeightToBooking(user.effectiveOrganizationId, customer, bookingId, weightTons);
  }

  revalidatePath(`/customers/${customerId}`);
}

// The scale receipt (and so the real weight) only exists once the load's
// already been dumped — well after "Mark Returned," which is the only
// place actualTonnage could otherwise be entered. Without this, actualTonnage
// stays null forever and invoicing.ts's overage-tonnage charge never fires.
// Only auto-applies when exactly one of this booking's items has been
// returned but has no weight yet — with zero or more than one candidate
// there's no safe way to guess which item a given scale receipt belongs
// to, so the entry is still logged, just not synced to billing or checked
// for overage (a staff member can still read the weight off the Dump Log
// and handle that booking's invoice manually).
//
// Public checkout creates the invoice at booking time and
// createDraftInvoiceForBooking never recomputes an existing one, so
// recording the weight alone changes nothing on the invoice — the overage
// line is added to it here. That's only done while the invoice is still
// plain "unpaid" with no installment plan; a paid, partly-paid or
// installment invoice is left alone (changing what was already collected
// against would leave it inconsistent) and a note is left on the customer
// for staff to bill by hand. The customer is only texted when the charge
// really is on their invoice.
export async function applyDumpWeightToBooking(
  organizationId: string,
  customer: { id: string; name: string; phone: string | null },
  bookingId: string,
  weightTons: number,
  // When a booking has several returned-but-unweighed items, the person
  // entering the weight can say which one the scale ticket belongs to.
  itemId?: string
) {
  const booking = await db.booking.findFirst({
    where: { id: bookingId, organizationId },
    include: { items: { include: { equipmentItem: { include: { category: true } } } } },
  });
  if (!booking || booking.customerId !== customer.id) return;

  const unweighedReturnedItems = booking.items.filter(
    (item) =>
      item.actualReturnDate !== null && item.actualTonnage === null && (!itemId || item.id === itemId)
  );
  if (unweighedReturnedItems.length !== 1) return;
  const item = unweighedReturnedItems[0];

  await db.bookingItem.update({
    where: { id: item.id },
    data: { actualTonnage: weightTons },
  });

  const category = item.equipmentItem.category;
  if (category.includedTonnage === null || category.overageTonnageRate === null) return;
  const extraTons = Math.max(0, weightTons - category.includedTonnage);
  if (extraTons <= 0) return;

  const overageFee = extraTons * category.overageTonnageRate;
  const description = `${item.equipmentItem.label} — Extra Tonnage (${extraTons.toFixed(2)} tons × $${category.overageTonnageRate.toFixed(2)})`;

  const invoice = await db.invoice.findFirst({
    where: { bookingId, organizationId },
    include: { lineItems: true, installments: true },
  });

  let billed = false;
  if (!invoice) {
    // Not invoiced yet — the line is computed from actualTonnage when it is.
    billed = true;
  } else if (
    invoice.lineItems.some(
      (line) => line.type === "overage_tonnage" && line.description.startsWith(item.equipmentItem.label)
    )
  ) {
    billed = true;
  } else if (invoice.status === "unpaid" && invoice.installments.length === 0) {
    const taxSettings = await getTaxSettings(organizationId);
    const taxLine = invoice.lineItems.find((line) => line.type === "tax");
    const taxDelta =
      taxLine && taxSettings.enabled && taxSettings.ratePercent > 0
        ? overageFee * (taxSettings.ratePercent / 100)
        : 0;

    await db.$transaction(async (tx) => {
      await tx.invoiceLineItem.create({
        data: { invoiceId: invoice.id, description, amount: overageFee, type: "overage_tonnage" },
      });
      if (taxLine && taxDelta > 0) {
        await tx.invoiceLineItem.update({
          where: { id: taxLine.id },
          data: { amount: { increment: taxDelta } },
        });
      }
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { amount: { increment: overageFee + taxDelta } },
      });
    });
    billed = true;
  }

  if (!billed) {
    await db.customerNote.create({
      data: {
        customerId: customer.id,
        type: "note",
        content: `Dump weight ${weightTons.toFixed(2)} tons is ${extraTons.toFixed(2)} tons over the ${category.includedTonnage.toFixed(2)} included ($${overageFee.toFixed(2)} overage), but invoice ${invoice?.invoiceNumber} is already ${invoice?.status === "unpaid" ? "on an installment plan" : invoice?.status}, so the charge was NOT added automatically — bill it manually. The customer was not texted.`,
      },
    });
    return;
  }

  const body = `Hi ${customer.name}, heads up — your rental came in at ${weightTons.toFixed(2)} tons, which is ${extraTons.toFixed(2)} tons over the ${category.includedTonnage.toFixed(2)} tons included. A $${overageFee.toFixed(2)} overage charge has been added to your invoice. Questions? Call or text us at ${branding.smsPhone}.`;

  // Best-effort: Twilio not connected yet, or no phone on file, just means
  // no text goes out — the weight is still correctly applied to the
  // booking either way, so billing isn't held hostage by texting being set up.
  try {
    await sendCustomerSms(organizationId, { id: customer.id, phone: customer.phone }, body);
  } catch (err) {
    console.error("Failed to send overweight notice:", err);
  }
}

// Called imperatively from DumpReceiptScanField as soon as a photo is
// picked — uploads it and reads the weight/fee/date off it with the same
// vision-API approach as expense receipt scanning, so the surrounding
// manual-entry form (see the Dump Log tab) can be pre-filled but is still
// fully editable before the user actually saves the entry.
export async function scanDumpReceipt(formData: FormData) {
  await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A receipt photo is required");
  }
  if (!isReceiptScanConfigured()) {
    throw new Error(
      "Receipt scanning isn't set up yet — add an ANTHROPIC_API_KEY first."
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const [scanned, receiptUrl] = await Promise.all([
    scanDumpReceiptImage(buffer.toString("base64"), file.type || "image/jpeg"),
    saveDumpReceiptFile(file),
  ]);

  return {
    weightTons: scanned.weightTons,
    fee: scanned.fee,
    date: scanned.date,
    receiptUrl,
  };
}

export async function deleteDumpLogEntry(customerId: string, entryId: string) {
  const user = await requireUser();
  await db.dumpLogEntry.findFirstOrThrow({
    where: { id: entryId, customer: { organizationId: user.effectiveOrganizationId } },
  });
  await db.dumpLogEntry.delete({ where: { id: entryId } });
  revalidatePath(`/customers/${customerId}`);
}

export async function addCreditEntry(customerId: string, formData: FormData) {
  const user = await requireUser();
  const amountStr = str(formData, "amount");
  const reason = str(formData, "reason");

  if (!amountStr || Number(amountStr) === 0) {
    throw new Error("Enter a non-zero amount");
  }
  if (!reason) throw new Error("A reason is required");

  await db.customer.findFirstOrThrow({
    where: { id: customerId, organizationId: user.effectiveOrganizationId },
  });

  await db.customerCreditEntry.create({
    data: { customerId, amount: Number(amountStr), reason },
  });

  revalidatePath(`/customers/${customerId}`);
}

export async function deleteCreditEntry(customerId: string, entryId: string) {
  const user = await requireUser();
  await db.customerCreditEntry.findFirstOrThrow({
    where: { id: entryId, customer: { organizationId: user.effectiveOrganizationId } },
  });
  await db.customerCreditEntry.delete({ where: { id: entryId } });
  revalidatePath(`/customers/${customerId}`);
}
