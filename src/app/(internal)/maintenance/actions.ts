"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { saveMaintenanceReceiptFile, deleteUploadedFile } from "@/lib/uploads";
import { requireUser } from "@/lib/session";

export async function addMaintenanceEntry(formData: FormData) {
  const user = await requireUser();

  const vehicleId = str(formData, "vehicleId");
  const equipmentItemId = str(formData, "equipmentItemId");
  const type = str(formData, "type");
  const description = str(formData, "description");
  const dateStr = str(formData, "date");
  const costStr = str(formData, "cost");
  const vendor = str(formData, "vendor");
  const odometerAtServiceStr = str(formData, "odometerAtService");
  const nextServiceDueStr = str(formData, "nextServiceDue");
  const notes = str(formData, "notes");
  const file = formData.get("receipt");

  if (!vehicleId && !equipmentItemId) throw new Error("Select a vehicle or piece of equipment");
  if (!type) throw new Error("Type is required");
  if (!description) throw new Error("Description is required");
  if (!dateStr) throw new Error("Date is required");

  const receiptUrl = file instanceof File && file.size > 0 ? await saveMaintenanceReceiptFile(file) : null;

  await db.maintenanceLogEntry.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      vehicleId: vehicleId || null,
      equipmentItemId: equipmentItemId || null,
      type,
      description,
      date: new Date(dateStr),
      cost: costStr ? Number(costStr) : null,
      vendor,
      odometerAtService: odometerAtServiceStr ? Number(odometerAtServiceStr) : null,
      nextServiceDue: nextServiceDueStr ? new Date(nextServiceDueStr) : null,
      receiptUrl,
      notes,
    },
  });

  revalidatePath("/maintenance");
  revalidatePath("/");
}

export async function updateMaintenanceEntry(entryId: string, formData: FormData) {
  const user = await requireUser();

  const vehicleId = str(formData, "vehicleId");
  const equipmentItemId = str(formData, "equipmentItemId");
  const type = str(formData, "type");
  const description = str(formData, "description");
  const dateStr = str(formData, "date");
  const costStr = str(formData, "cost");
  const vendor = str(formData, "vendor");
  const odometerAtServiceStr = str(formData, "odometerAtService");
  const nextServiceDueStr = str(formData, "nextServiceDue");
  const notes = str(formData, "notes");

  if (!vehicleId && !equipmentItemId) throw new Error("Select a vehicle or piece of equipment");
  if (!type) throw new Error("Type is required");
  if (!description) throw new Error("Description is required");
  if (!dateStr) throw new Error("Date is required");

  await db.maintenanceLogEntry.updateMany({
    where: { id: entryId, organizationId: user.effectiveOrganizationId },
    data: {
      vehicleId: vehicleId || null,
      equipmentItemId: equipmentItemId || null,
      type,
      description,
      date: new Date(dateStr),
      cost: costStr ? Number(costStr) : null,
      vendor,
      odometerAtService: odometerAtServiceStr ? Number(odometerAtServiceStr) : null,
      nextServiceDue: nextServiceDueStr ? new Date(nextServiceDueStr) : null,
      notes,
    },
  });

  revalidatePath("/maintenance");
  revalidatePath("/");
  redirect("/maintenance");
}

export async function deleteMaintenanceEntry(entryId: string) {
  const user = await requireUser();

  const entry = await db.maintenanceLogEntry.findFirst({
    where: { id: entryId, organizationId: user.effectiveOrganizationId },
  });
  if (!entry) return;

  await db.maintenanceLogEntry.delete({ where: { id: entryId } });
  if (entry.receiptUrl) await deleteUploadedFile(entry.receiptUrl);

  revalidatePath("/maintenance");
  revalidatePath("/");
}
