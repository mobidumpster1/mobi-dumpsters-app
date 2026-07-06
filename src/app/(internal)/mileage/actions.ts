"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";

export async function addMileageEntry(formData: FormData) {
  const target = str(formData, "target");
  const dateStr = str(formData, "date");
  const milesStr = str(formData, "miles");
  const purpose = str(formData, "purpose");
  const bookingId = str(formData, "bookingId");
  const notes = str(formData, "notes");

  if (!target) throw new Error("Vehicle or equipment is required");
  if (!dateStr) throw new Error("Date is required");
  if (!milesStr || Number(milesStr) <= 0) throw new Error("Miles must be a positive number");
  if (!purpose) throw new Error("Purpose is required");

  const [kind, id] = target.split(":");
  if ((kind !== "vehicle" && kind !== "equipment") || !id) {
    throw new Error("Invalid vehicle or equipment selection");
  }

  await db.mileageLogEntry.create({
    data: {
      vehicleId: kind === "vehicle" ? id : null,
      equipmentItemId: kind === "equipment" ? id : null,
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

export async function addVehicle(formData: FormData) {
  const label = str(formData, "label");
  if (!label) throw new Error("Vehicle name is required");

  await db.vehicle.create({
    data: { label, notes: str(formData, "notes") },
  });

  revalidatePath("/mileage");
}

export async function toggleVehicleActive(vehicleId: string, currentlyActive: boolean) {
  await db.vehicle.update({
    where: { id: vehicleId },
    data: { active: !currentlyActive },
  });
  revalidatePath("/mileage");
}
