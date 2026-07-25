"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { requireUser, hasPermission } from "@/lib/session";

async function requireOwnedAgreement(id: string, organizationId: string) {
  return db.demolitionAgreement.findFirstOrThrow({ where: { id, organizationId } });
}

export async function createDemolitionAgreement(formData: FormData) {
  const user = await requireUser();

  const structureDescription = str(formData, "structureDescription");
  const propertyAddress = str(formData, "propertyAddress");
  const quotedPriceStr = str(formData, "quotedPrice");
  if (!structureDescription) throw new Error("Structure description is required");
  if (!propertyAddress) throw new Error("Property address is required");
  if (!quotedPriceStr || Number(quotedPriceStr) <= 0) throw new Error("Quoted price is required");

  const depositDueStr = str(formData, "depositDue");
  const balanceDueStr = str(formData, "balanceDue");
  const customerId = str(formData, "customerId");

  const agreement = await db.demolitionAgreement.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      customerId: customerId || null,
      structureDescription,
      propertyAddress,
      dimensions: str(formData, "dimensions"),
      foundationRemovalIncluded: formData.get("foundationRemovalIncluded") === "on",
      quotedPrice: Number(quotedPriceStr),
      depositDue: depositDueStr ? Number(depositDueStr) : null,
      balanceDue: balanceDueStr ? Number(balanceDueStr) : null,
      staffSignerName: user.name,
    },
  });

  revalidatePath("/demolition-agreements");
  redirect(`/demolition-agreements/${agreement.id}`);
}

export async function updateDemolitionAgreement(id: string, formData: FormData) {
  const user = await requireUser();
  const existing = await requireOwnedAgreement(id, user.effectiveOrganizationId);
  if (existing.status === "signed") {
    throw new Error("This agreement has already been signed and can't be edited.");
  }

  const structureDescription = str(formData, "structureDescription");
  const propertyAddress = str(formData, "propertyAddress");
  const quotedPriceStr = str(formData, "quotedPrice");
  if (!structureDescription) throw new Error("Structure description is required");
  if (!propertyAddress) throw new Error("Property address is required");
  if (!quotedPriceStr || Number(quotedPriceStr) <= 0) throw new Error("Quoted price is required");

  const depositDueStr = str(formData, "depositDue");
  const balanceDueStr = str(formData, "balanceDue");
  const customerId = str(formData, "customerId");

  await db.demolitionAgreement.update({
    where: { id },
    data: {
      customerId: customerId || null,
      structureDescription,
      propertyAddress,
      dimensions: str(formData, "dimensions"),
      foundationRemovalIncluded: formData.get("foundationRemovalIncluded") === "on",
      quotedPrice: Number(quotedPriceStr),
      depositDue: depositDueStr ? Number(depositDueStr) : null,
      balanceDue: balanceDueStr ? Number(balanceDueStr) : null,
    },
  });

  revalidatePath("/demolition-agreements");
  revalidatePath(`/demolition-agreements/${id}`);
  redirect(`/demolition-agreements/${id}`);
}

export async function deleteDemolitionAgreement(id: string) {
  const user = await requireUser();
  if (!hasPermission(user, "canDeleteRecords")) {
    throw new Error("You don't have permission to delete records.");
  }
  await requireOwnedAgreement(id, user.effectiveOrganizationId);

  await db.demolitionAgreement.delete({ where: { id } });
  revalidatePath("/demolition-agreements");
  redirect("/demolition-agreements");
}
