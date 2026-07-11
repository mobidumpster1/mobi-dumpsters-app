"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { requireUser } from "@/lib/session";

export async function addMileageEntry(formData: FormData) {
  const user = await requireUser();
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
  if (!odometerStartStr) throw new Error("Starting mileage is required");

  const odometerStart = Number(odometerStartStr);
  const odometerEnd = odometerEndStr ? Number(odometerEndStr) : null;
  if (odometerEnd !== null && odometerEnd <= odometerStart) {
    throw new Error("Ending mileage must be greater than starting mileage");
  }

  await db.mileageLogEntry.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      vehicleId,
      equipmentItemId: equipmentItemId || null,
      date: new Date(dateStr),
      odometerStart,
      odometerEnd,
      miles: odometerEnd !== null ? odometerEnd - odometerStart : null,
      purpose,
      notes,
      source: "manual",
    },
  });

  revalidatePath("/mileage");
}

// Fills in the ending mileage for a trip that was only started so far.
export async function endMileageTrip(entryId: string, formData: FormData) {
  const user = await requireUser();
  const odometerEndStr = str(formData, "odometerEnd");
  if (!odometerEndStr) throw new Error("Ending mileage is required");

  const entry = await db.mileageLogEntry.findFirstOrThrow({
    where: { id: entryId, organizationId: user.effectiveOrganizationId },
  });
  const odometerEnd = Number(odometerEndStr);
  if (entry.odometerStart == null || odometerEnd <= entry.odometerStart) {
    throw new Error("Ending mileage must be greater than starting mileage");
  }

  await db.mileageLogEntry.update({
    where: { id: entryId },
    data: { odometerEnd, miles: odometerEnd - entry.odometerStart },
  });

  revalidatePath("/mileage");
}

export async function updateMileageEntry(entryId: string, formData: FormData) {
  const user = await requireUser();
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
  if (!odometerStartStr) throw new Error("Starting mileage is required");

  const odometerStart = Number(odometerStartStr);
  const odometerEnd = odometerEndStr ? Number(odometerEndStr) : null;
  if (odometerEnd !== null && odometerEnd <= odometerStart) {
    throw new Error("Ending mileage must be greater than starting mileage");
  }

  await db.mileageLogEntry.updateMany({
    where: { id: entryId, organizationId: user.effectiveOrganizationId },
    data: {
      vehicleId,
      equipmentItemId: equipmentItemId || null,
      date: new Date(dateStr),
      odometerStart,
      odometerEnd,
      miles: odometerEnd !== null ? odometerEnd - odometerStart : null,
      purpose,
      notes,
    },
  });

  revalidatePath("/mileage");
  redirect("/mileage");
}

export async function deleteMileageEntry(entryId: string) {
  const user = await requireUser();
  await db.mileageLogEntry.deleteMany({
    where: { id: entryId, organizationId: user.effectiveOrganizationId },
  });
  revalidatePath("/mileage");
}

export async function addVehicle(formData: FormData) {
  const user = await requireUser();
  const label = str(formData, "label");
  if (!label) throw new Error("Vehicle name is required");

  await db.vehicle.create({
    data: { organizationId: user.effectiveOrganizationId, label, notes: str(formData, "notes") },
  });

  revalidatePath("/mileage");
}

export async function toggleVehicleActive(vehicleId: string, currentlyActive: boolean) {
  const user = await requireUser();
  await db.vehicle.updateMany({
    where: { id: vehicleId, organizationId: user.effectiveOrganizationId },
    data: { active: !currentlyActive },
  });
  revalidatePath("/mileage");
}
