"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";

export async function addMileageEntry(formData: FormData) {
  const vehicleId = str(formData, "vehicleId");
  const equipmentItemId = str(formData, "equipmentItemId");
  const dateStr = str(formData, "date");
  const odometerStartStr = str(formData, "odometerStart");
  const odometerEndStr = str(formData, "odometerEnd");
  const purpose = str(formData, "purpose");
  const notes = str(formData, "notes");

  if (!vehicleId) throw new Error("Truck is required");
  if (!dateStr) throw new Error("Date is required");
  if (!purpose) throw new Error("Purpose is required");
  if (!odometerStartStr || !odometerEndStr) {
    throw new Error("Starting and ending mileage are required");
  }

  const odometerStart = Number(odometerStartStr);
  const odometerEnd = Number(odometerEndStr);
  if (odometerEnd <= odometerStart) {
    throw new Error("Ending mileage must be greater than starting mileage");
  }

  await db.mileageLogEntry.create({
    data: {
      vehicleId,
      equipmentItemId: equipmentItemId || null,
      date: new Date(dateStr),
      odometerStart,
      odometerEnd,
      miles: odometerEnd - odometerStart,
      purpose,
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
