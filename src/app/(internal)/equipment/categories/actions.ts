"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { requireUser } from "@/lib/session";

function num(formData: FormData, key: string): number | null {
  const raw = str(formData, key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isNaN(value) ? null : value;
}

function pricingFields(formData: FormData) {
  return {
    agingThresholdDays: num(formData, "agingThresholdDays") ?? 14,
    basePrice: num(formData, "basePrice"),
    includedDays: num(formData, "includedDays"),
    overageDayRate: num(formData, "overageDayRate"),
    includedTonnage: num(formData, "includedTonnage"),
    overageTonnageRate: num(formData, "overageTonnageRate"),
    includedMileage: num(formData, "includedMileage"),
    overageMileageRate: num(formData, "overageMileageRate"),
  };
}

function pricingTiers(formData: FormData) {
  const json = formData.get("pricingTiersJson");
  if (typeof json !== "string") return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t) => t && typeof t.label === "string" && t.label.trim())
      .map((t, i) => ({
        label: t.label,
        days: Number(t.days) || 1,
        price: t.price === null || t.price === "" ? null : Number(t.price),
        sortOrder: i,
      }));
  } catch {
    return [];
  }
}

function materialOptions(formData: FormData) {
  const json = formData.get("materialOptionsJson");
  if (typeof json !== "string") return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m) => m && typeof m.name === "string" && m.name.trim())
      .map((m, i) => ({
        name: m.name,
        unit: typeof m.unit === "string" && m.unit.trim() ? m.unit : "unit",
        pricePerUnit: Number(m.pricePerUnit) || 0,
        sortOrder: i,
      }));
  } catch {
    return [];
  }
}

function bundleFields(formData: FormData) {
  const bundleOfCategoryId = str(formData, "bundleOfCategoryId");
  return {
    bundleOfCategoryId: bundleOfCategoryId || null,
    bundleQuantity: bundleOfCategoryId ? num(formData, "bundleQuantity") ?? 1 : 1,
  };
}

// A name-only category, for adding a new rental type inline while adding
// equipment (see EquipmentItemForm's "+ New Category") instead of leaving
// the page. Pricing, photo, and dimensions are still filled in later from
// the full category edit page — same trade-off as quickAddCustomer.
export async function quickAddCategory(formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const existing = await db.equipmentCategory.findFirst({
    where: { organizationId: user.effectiveOrganizationId, name },
  });
  if (existing) return { id: existing.id, name: existing.name };

  const category = await db.equipmentCategory.create({
    data: { organizationId: user.effectiveOrganizationId, name },
  });

  return { id: category.id, name: category.name };
}

export async function createCategory(formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const fieldDefinitionsJson = formData.get("fieldDefinitionsJson");
  const fieldDefinitions =
    typeof fieldDefinitionsJson === "string" ? fieldDefinitionsJson : "[]";

  await db.equipmentCategory.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      name,
      description: str(formData, "description"),
      dimensions: str(formData, "dimensions"),
      bookingNote: str(formData, "bookingNote"),
      imageUrl: str(formData, "imageUrl"),
      fieldDefinitions,
      ...pricingFields(formData),
      ...bundleFields(formData),
      pricingTiers: { create: pricingTiers(formData) },
      materialOptions: { create: materialOptions(formData) },
    },
  });

  redirect("/equipment/categories");
}

export async function updateCategory(categoryId: string, formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const fieldDefinitionsJson = formData.get("fieldDefinitionsJson");
  const fieldDefinitions =
    typeof fieldDefinitionsJson === "string" ? fieldDefinitionsJson : "[]";

  await db.equipmentCategory.findFirstOrThrow({
    where: { id: categoryId, organizationId: user.effectiveOrganizationId },
  });

  await db.pricingTier.deleteMany({ where: { categoryId } });
  await db.materialOption.deleteMany({ where: { categoryId } });
  await db.equipmentCategory.update({
    where: { id: categoryId },
    data: {
      name,
      description: str(formData, "description"),
      dimensions: str(formData, "dimensions"),
      bookingNote: str(formData, "bookingNote"),
      imageUrl: str(formData, "imageUrl"),
      fieldDefinitions,
      ...pricingFields(formData),
      ...bundleFields(formData),
      pricingTiers: { create: pricingTiers(formData) },
      materialOptions: { create: materialOptions(formData) },
    },
  });

  redirect("/equipment/categories");
}
