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
      fieldDefinitions,
      ...pricingFields(formData),
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

  await db.equipmentCategory.update({
    where: { id: categoryId },
    data: {
      name,
      description: str(formData, "description"),
      fieldDefinitions,
      ...pricingFields(formData),
    },
  });

  redirect("/equipment/categories");
}
