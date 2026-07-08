"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";

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

function bundleFields(formData: FormData) {
  const bundleOfCategoryId = str(formData, "bundleOfCategoryId");
  return {
    bundleOfCategoryId: bundleOfCategoryId || null,
    bundleQuantity: bundleOfCategoryId ? num(formData, "bundleQuantity") ?? 1 : 1,
  };
}

export async function createCategory(formData: FormData) {
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const fieldDefinitionsJson = formData.get("fieldDefinitionsJson");
  const fieldDefinitions =
    typeof fieldDefinitionsJson === "string" ? fieldDefinitionsJson : "[]";

  await db.equipmentCategory.create({
    data: {
      name,
      description: str(formData, "description"),
      imageUrl: str(formData, "imageUrl"),
      fieldDefinitions,
      ...pricingFields(formData),
      ...bundleFields(formData),
      pricingTiers: { create: pricingTiers(formData) },
    },
  });

  redirect("/equipment/categories");
}

export async function updateCategory(categoryId: string, formData: FormData) {
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const fieldDefinitionsJson = formData.get("fieldDefinitionsJson");
  const fieldDefinitions =
    typeof fieldDefinitionsJson === "string" ? fieldDefinitionsJson : "[]";

  await db.pricingTier.deleteMany({ where: { categoryId } });
  await db.equipmentCategory.update({
    where: { id: categoryId },
    data: {
      name,
      description: str(formData, "description"),
      imageUrl: str(formData, "imageUrl"),
      fieldDefinitions,
      ...pricingFields(formData),
      ...bundleFields(formData),
      pricingTiers: { create: pricingTiers(formData) },
    },
  });

  redirect("/equipment/categories");
}
