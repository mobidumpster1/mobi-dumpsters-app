import { db } from "@/lib/db";

export type PromoCodeCheck =
  | { ok: true; promoCode: { id: string; code: string }; amountOff: number }
  | { ok: false; error: string };

// Server-authoritative on purpose — never trust a discount amount computed
// client-side, same reasoning as tier/material pricing being recomputed
// here instead of trusted from the booking form.
//
// categoryIds is every equipment category actually in the booking (usually
// one, since the public flow only ever books a single category — the admin
// side can have several). A category-restricted code just needs one match,
// not all of them, so a mixed order isn't rejected outright.
export async function validatePromoCode(
  organizationId: string,
  rawCode: string,
  subtotal: number,
  categoryIds: string[]
): Promise<PromoCodeCheck> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a promo code." };

  const promo = await db.promoCode.findUnique({
    where: { organizationId_code: { organizationId, code } },
    include: { restrictedCategory: true },
  });

  if (!promo || !promo.active) {
    return { ok: false, error: "That promo code isn't valid." };
  }
  if (promo.expiresAt && promo.expiresAt < new Date()) {
    return { ok: false, error: "That promo code has expired." };
  }
  if (promo.maxRedemptions !== null && promo.redemptionCount >= promo.maxRedemptions) {
    return { ok: false, error: "That promo code has already been fully redeemed." };
  }
  if (promo.minimumSpend !== null && subtotal < promo.minimumSpend) {
    return {
      ok: false,
      error: `This code needs a minimum order of $${promo.minimumSpend.toFixed(2)}.`,
    };
  }
  if (promo.restrictedCategoryId !== null && !categoryIds.includes(promo.restrictedCategoryId)) {
    return {
      ok: false,
      error: `This code only applies to ${promo.restrictedCategory?.name ?? "a specific rental type"}.`,
    };
  }

  const rawAmount = promo.type === "percent" ? subtotal * (promo.value / 100) : promo.value;
  const amountOff = Math.min(Math.max(rawAmount, 0), subtotal);

  return { ok: true, promoCode: { id: promo.id, code: promo.code }, amountOff };
}

export async function recordPromoCodeRedemption(promoCodeId: string) {
  await db.promoCode.update({
    where: { id: promoCodeId },
    data: { redemptionCount: { increment: 1 } },
  });
}

// Spreads a total discount across a set of priced items proportionally to
// each item's share of the subtotal, so a $30-off code on a 2-item booking
// knocks more off the pricier item rather than splitting evenly — matters
// for per-item reporting (job costing, equipment revenue) staying accurate.
export function applyDiscountToItemPrices<T extends { price: number }>(
  items: T[],
  discountAmount: number
): T[] {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  if (subtotal <= 0 || discountAmount <= 0) return items;
  return items.map((item) => ({
    ...item,
    price: Math.max(0, item.price - discountAmount * (item.price / subtotal)),
  }));
}
