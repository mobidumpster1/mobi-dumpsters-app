"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import {
  buildAttributesFromForm,
  parseFieldDefinitions,
} from "@/lib/categoryFields";

export async function createEquipmentItem(formData: FormData) {
  const categoryId = str(formData, "categoryId");
  const label = str(formData, "label");
  if (!categoryId) throw new Error("Category is required");
  if (!label) throw new Error("Label is required");

  const category = await db.equipmentCategory.findUniqueOrThrow({
    where: { id: categoryId },
  });
  const fieldDefs = parseFieldDefinitions(category.fieldDefinitions);
  const attributes = buildAttributesFromForm(formData, fieldDefs);

  const item = await db.equipmentItem.create({
    data: {
      categoryId,
      label,
      assetTag: str(formData, "assetTag"),
      status: str(formData, "status") ?? "available",
      currentLocation: str(formData, "currentLocation"),
      currentCustomerId: str(formData, "currentCustomerId"),
      notes: str(formData, "notes"),
      attributes: JSON.stringify(attributes),
    },
  });

  redirect(`/equipment/${item.id}`);
}

export async function updateEquipmentItem(
  itemId: string,
  formData: FormData
) {
  const categoryId = str(formData, "categoryId");
  const label = str(formData, "label");
  if (!categoryId) throw new Error("Category is required");
  if (!label) throw new Error("Label is required");

  const category = await db.equipmentCategory.findUniqueOrThrow({
    where: { id: categoryId },
  });
  const fieldDefs = parseFieldDefinitions(category.fieldDefinitions);
  const attributes = buildAttributesFromForm(formData, fieldDefs);

  await db.equipmentItem.update({
    where: { id: itemId },
    data: {
      categoryId,
      label,
      assetTag: str(formData, "assetTag"),
      status: str(formData, "status") ?? "available",
      currentLocation: str(formData, "currentLocation"),
      currentCustomerId: str(formData, "currentCustomerId"),
      notes: str(formData, "notes"),
      attributes: JSON.stringify(attributes),
    },
  });

  redirect(`/equipment/${itemId}`);
}
