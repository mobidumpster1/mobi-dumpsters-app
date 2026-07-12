"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import {
  buildAttributesFromForm,
  parseFieldDefinitions,
} from "@/lib/categoryFields";
import { requireUser } from "@/lib/session";

// The equipment form also lets the user set the category's own photo,
// price, and dimensions inline (instead of a separate "edit category" trip)
// since those are what customers see on the booking page. Only touched when
// present — the price field is omitted from the form for tiered-pricing
// categories, so it's left alone rather than nulled out.
async function applyCategoryDetails(
  categoryId: string,
  organizationId: string,
  formData: FormData
) {
  if (!formData.has("categoryImageUrl")) return;
  const data: { imageUrl: string | null; dimensions: string | null; basePrice?: number | null } = {
    imageUrl: str(formData, "categoryImageUrl"),
    dimensions: str(formData, "categoryDimensions"),
  };
  if (formData.has("categoryBasePrice")) {
    const raw = str(formData, "categoryBasePrice");
    data.basePrice = raw ? Number(raw) : null;
  }
  await db.equipmentCategory.updateMany({
    where: { id: categoryId, organizationId },
    data,
  });
}

export async function createEquipmentItem(formData: FormData) {
  const user = await requireUser();
  const categoryId = str(formData, "categoryId");
  const label = str(formData, "label");
  if (!categoryId) throw new Error("Category is required");
  if (!label) throw new Error("Label is required");

  const category = await db.equipmentCategory.findFirstOrThrow({
    where: { id: categoryId, organizationId: user.effectiveOrganizationId },
  });
  const fieldDefs = parseFieldDefinitions(category.fieldDefinitions);
  const attributes = buildAttributesFromForm(formData, fieldDefs);

  const item = await db.equipmentItem.create({
    data: {
      organizationId: user.effectiveOrganizationId,
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

  await applyCategoryDetails(categoryId, user.effectiveOrganizationId, formData);

  redirect(`/equipment/${item.id}`);
}

export async function updateEquipmentItem(
  itemId: string,
  formData: FormData
) {
  const user = await requireUser();
  const categoryId = str(formData, "categoryId");
  const label = str(formData, "label");
  if (!categoryId) throw new Error("Category is required");
  if (!label) throw new Error("Label is required");

  const category = await db.equipmentCategory.findFirstOrThrow({
    where: { id: categoryId, organizationId: user.effectiveOrganizationId },
  });
  const fieldDefs = parseFieldDefinitions(category.fieldDefinitions);
  const attributes = buildAttributesFromForm(formData, fieldDefs);

  await db.equipmentItem.updateMany({
    where: { id: itemId, organizationId: user.effectiveOrganizationId },
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

  await applyCategoryDetails(categoryId, user.effectiveOrganizationId, formData);

  redirect(`/equipment/${itemId}`);
}

// A fast one-click way to fix/change status without opening the full Edit
// form — e.g. clearing a stuck "Reserved" after a booking was cancelled.
// Switching to "available" also clears any leftover customer/location so
// the item doesn't look tied to a job it's no longer on.
export async function quickSetEquipmentStatus(
  itemId: string,
  formData: FormData
) {
  const user = await requireUser();
  const status = str(formData, "status");
  if (!status) throw new Error("Status is required");

  await db.equipmentItem.updateMany({
    where: { id: itemId, organizationId: user.effectiveOrganizationId },
    data:
      status === "available"
        ? { status, currentCustomerId: null, currentLocation: "Yard" }
        : { status },
  });

  revalidatePath("/equipment");
  revalidatePath(`/equipment/${itemId}`);
}
