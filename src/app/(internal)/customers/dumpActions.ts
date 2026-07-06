"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";

export async function addDumpLogEntry(customerId: string, formData: FormData) {
  const dateStr = str(formData, "date");
  const weightTonsStr = str(formData, "weightTons");
  const feeStr = str(formData, "fee");
  const bookingId = str(formData, "bookingId");
  const notes = str(formData, "notes");

  if (!dateStr) throw new Error("Date is required");
  if (!weightTonsStr) throw new Error("Weight is required");
  if (!feeStr) throw new Error("Fee is required");

  await db.dumpLogEntry.create({
    data: {
      customerId,
      bookingId: bookingId || null,
      date: new Date(dateStr),
      weightTons: Number(weightTonsStr),
      fee: Number(feeStr),
      notes,
    },
  });

  revalidatePath(`/customers/${customerId}`);
}

export async function deleteDumpLogEntry(customerId: string, entryId: string) {
  await db.dumpLogEntry.delete({ where: { id: entryId } });
  revalidatePath(`/customers/${customerId}`);
}

export async function addCreditEntry(customerId: string, formData: FormData) {
  const amountStr = str(formData, "amount");
  const reason = str(formData, "reason");

  if (!amountStr || Number(amountStr) === 0) {
    throw new Error("Enter a non-zero amount");
  }
  if (!reason) throw new Error("A reason is required");

  await db.customerCreditEntry.create({
    data: { customerId, amount: Number(amountStr), reason },
  });

  revalidatePath(`/customers/${customerId}`);
}

export async function deleteCreditEntry(customerId: string, entryId: string) {
  await db.customerCreditEntry.delete({ where: { id: entryId } });
  revalidatePath(`/customers/${customerId}`);
}
