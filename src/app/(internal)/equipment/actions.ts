"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import {
  buildAttributesFromForm,
  parseFieldDefinitions,
} from "@/lib/categoryFields";
import { nextAssetTag } from "@/lib/assetTags";
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

  const manualAssetTag = str(formData, "assetTag");
  const assetTag =
    manualAssetTag ??
    (category.assetTagPrefix ? await nextAssetTag(categoryId, category.assetTagPrefix) : null);

  const item = await db.equipmentItem.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      categoryId,
      label,
      assetTag,
      status: str(formData, "status") ?? "available",
      currentLocation: str(formData, "currentLocation"),
      currentCustomerId: str(formData, "currentCustomerId"),
      homeLocationId: str(formData, "homeLocationId"),
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
      homeLocationId: str(formData, "homeLocationId"),
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

// Blocks a future date range out for planned maintenance — the item won't
// show as available for booking, and can't be dragged onto in the calendar,
// for that range (see findAvailableItems/rescheduleBookingItem). Doesn't
// touch the item's current status; that's still a separate manual flip
// when the item is actually pulled for work.
export async function scheduleMaintenanceWindow(itemId: string, formData: FormData) {
  const user = await requireUser();
  await db.equipmentItem.findFirstOrThrow({
    where: { id: itemId, organizationId: user.effectiveOrganizationId },
  });

  const startDateStr = str(formData, "startDate");
  const endDateStr = str(formData, "endDate");
  if (!startDateStr || !endDateStr) throw new Error("Start and end dates are required.");

  const startDate = new Date(startDateStr);
  // Runs through the end of the chosen end day, not its midnight start, so
  // a one-day window (start === end) actually blocks that whole day.
  const endDate = new Date(new Date(endDateStr).getTime() + 24 * 60 * 60 * 1000);
  if (endDate <= startDate) throw new Error("End date must be on or after the start date.");

  await db.maintenanceWindow.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      equipmentItemId: itemId,
      startDate,
      endDate,
      reason: str(formData, "reason"),
    },
  });

  revalidatePath(`/equipment/${itemId}`);
  revalidatePath("/equipment");
}

export async function cancelMaintenanceWindow(windowId: string) {
  const user = await requireUser();
  const window = await db.maintenanceWindow.findFirstOrThrow({
    where: { id: windowId, organizationId: user.effectiveOrganizationId },
  });

  await db.maintenanceWindow.delete({ where: { id: windowId } });

  revalidatePath(`/equipment/${window.equipmentItemId}`);
  revalidatePath("/equipment");
}
