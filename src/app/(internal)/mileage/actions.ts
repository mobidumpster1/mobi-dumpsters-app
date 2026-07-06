"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";

export async function addMileageEntry(formData: FormData) {
  const equipmentItemId = str(formData, "equipmentItemId");
  const dateStr = str(formData, "date");
  const milesStr = str(formData, "miles");
  const purpose = str(formData, "purpose");
  const bookingId = str(formData, "bookingId");
  const notes = str(formData, "notes");

  if (!equipmentItemId) throw new Error("Equipment is required");
  if (!dateStr) throw new Error("Date is required");
  if (!milesStr || Number(milesStr) <= 0) throw new Error("Miles must be a positive number");
  if (!purpose) throw new Error("Purpose is required");

  await db.mileageLogEntry.create({
    data: {
      equipmentItemId,
      date: new Date(dateStr),
      miles: Number(milesStr),
      purpose,
      bookingId: bookingId || null,
      notes,
      source: "manual",
    },
  });

  revalidatePath("/mileage");
}

export async function deleteMileageEntry(entryId: string) {
  await db.mileageLogEntry.delete({ where: { id: entryId } });
  revalidatePath("/mileage");
}
