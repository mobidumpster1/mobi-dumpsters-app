"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { requireUser } from "@/lib/session";

export async function createPromoCode(formData: FormData) {
  const user = await requireUser();

  const codeInput = str(formData, "code");
  const type = str(formData, "type");
  const valueStr = str(formData, "value");
  if (!codeInput) throw new Error("A code is required");
  if (type !== "percent" && type !== "flat") throw new Error("Choose percent or dollars off");
  const value = Number(valueStr);
  if (!(value > 0)) throw new Error("Enter an amount greater than 0");
  if (type === "percent" && value > 100) throw new Error("A percent-off code can't exceed 100%");

  const code = codeInput.trim().toUpperCase();
  const expiresAtStr = str(formData, "expiresAt");
  const maxRedemptionsStr = str(formData, "maxRedemptions");

  const existing = await db.promoCode.findUnique({
    where: { organizationId_code: { organizationId: user.effectiveOrganizationId, code } },
  });
  if (existing) throw new Error(`"${code}" already exists.`);

  await db.promoCode.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      code,
      type,
      value,
      expiresAt: expiresAtStr ? new Date(expiresAtStr) : null,
      maxRedemptions: maxRedemptionsStr ? Math.max(1, Number(maxRedemptionsStr) || 0) : null,
    },
  });

  revalidatePath("/promotions");
}

export async function setPromoCodeActive(promoCodeId: string, active: boolean) {
  const user = await requireUser();
  await db.promoCode.updateMany({
    where: { id: promoCodeId, organizationId: user.effectiveOrganizationId },
    data: { active },
  });
  revalidatePath("/promotions");
}

export async function deletePromoCode(promoCodeId: string) {
  const user = await requireUser();
  await db.promoCode.deleteMany({
    where: { id: promoCodeId, organizationId: user.effectiveOrganizationId },
  });
  revalidatePath("/promotions");
}
