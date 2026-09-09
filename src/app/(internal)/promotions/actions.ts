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
  const minimumSpendStr = str(formData, "minimumSpend");
  const restrictedCategoryId = str(formData, "restrictedCategoryId");

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
      minimumSpend: minimumSpendStr ? Math.max(0, Number(minimumSpendStr) || 0) : null,
      restrictedCategoryId,
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

// A rule is either a weekend rule or a season rule, never both -- see the
// PricingRule model comment for why mixing the two triggers is rejected
// rather than given ambiguous AND/OR semantics.
export async function createPricingRule(formData: FormData) {
  const user = await requireUser();

  const name = str(formData, "name");
  const type = str(formData, "adjustmentType");
  const valueStr = str(formData, "adjustmentValue");
  if (!name) throw new Error("A name is required");
  if (type !== "percent" && type !== "flat") throw new Error("Choose percent or dollars");
  const value = Number(valueStr);
  if (!(value > 0)) throw new Error("Enter an amount greater than 0");

  const appliesSaturday = formData.get("appliesSaturday") === "on";
  const appliesSunday = formData.get("appliesSunday") === "on";
  const seasonStartStr = str(formData, "seasonStart"); // "MM-DD"
  const seasonEndStr = str(formData, "seasonEnd");

  const isWeekendRule = appliesSaturday || appliesSunday;
  const isSeasonRule = Boolean(seasonStartStr && seasonEndStr);
  if (isWeekendRule && isSeasonRule) {
    throw new Error("Pick either specific weekdays or a season range, not both, for one rule.");
  }
  if (!isWeekendRule && !isSeasonRule) {
    throw new Error("Pick at least one weekday or a season range.");
  }

  let seasonStartMonth: number | null = null;
  let seasonStartDay: number | null = null;
  let seasonEndMonth: number | null = null;
  let seasonEndDay: number | null = null;
  if (isSeasonRule) {
    const [startMonth, startDay] = seasonStartStr!.split("-").map(Number);
    const [endMonth, endDay] = seasonEndStr!.split("-").map(Number);
    if (!startMonth || !startDay || !endMonth || !endDay) {
      throw new Error("Enter valid season start/end dates.");
    }
    seasonStartMonth = startMonth;
    seasonStartDay = startDay;
    seasonEndMonth = endMonth;
    seasonEndDay = endDay;
  }

  await db.pricingRule.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      categoryId: str(formData, "categoryId"),
      name,
      adjustmentType: type,
      adjustmentValue: value,
      appliesSaturday,
      appliesSunday,
      seasonStartMonth,
      seasonStartDay,
      seasonEndMonth,
      seasonEndDay,
    },
  });

  revalidatePath("/promotions");
}

export async function setPricingRuleActive(pricingRuleId: string, active: boolean) {
  const user = await requireUser();
  await db.pricingRule.updateMany({
    where: { id: pricingRuleId, organizationId: user.effectiveOrganizationId },
    data: { active },
  });
  revalidatePath("/promotions");
}

export async function deletePricingRule(pricingRuleId: string) {
  const user = await requireUser();
  await db.pricingRule.deleteMany({
    where: { id: pricingRuleId, organizationId: user.effectiveOrganizationId },
  });
  revalidatePath("/promotions");
}
