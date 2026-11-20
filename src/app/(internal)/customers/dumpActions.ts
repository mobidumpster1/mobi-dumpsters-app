"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { scanDumpReceiptImage, isReceiptScanConfigured } from "@/lib/receiptScan";
import { saveDumpReceiptFile } from "@/lib/uploads";
import { requireUser } from "@/lib/session";
import { applyDumpWeightToBooking } from "@/lib/overageBilling";

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
