// Pure, server-safe pricing helpers shared between BookingForm ("use
// client") and server-rendered consumers like SectionRenderer.tsx. Kept
// in their own plain module deliberately: every export of a "use client"
// file becomes a client reference as far as the RSC boundary is
// concerned, even a plain non-component function — a Server Component
// can't call priceLabel()/includedTerms() if they live in BookingForm.tsx.

export type PricingTier = { id: string; label: string; days: number; price: number | null };
export type MaterialOption = { id: string; name: string; unit: string; pricePerUnit: number };

export type CategoryOption = {
  id: string;
  name: string;
  description: string | null;
  dimensions: string | null;
  bookingNote: string | null;
  imageUrl: string | null;
  basePrice: number | null;
  includedDays: number | null;
  overageDayRate: number | null;
  includedTonnage: number | null;
  overageTonnageRate: number | null;
  includedMileage: number | null;
  overageMileageRate: number | null;
  securityDepositAmount: number | null;
  bundleQuantity: number;
  crossSellCategoryIds: string[];
  pricingTiers: PricingTier[];
  materialOptions: MaterialOption[];
};

export function priceLabel(c: CategoryOption) {
  if (c.pricingTiers.length > 0) {
    const priced = c.pricingTiers.filter((t) => t.price != null);
    if (priced.length === 0) return "Call for pricing";
    const min = Math.min(...priced.map((t) => t.price as number));
    return `From $${min.toFixed(2)}`;
  }
  if (c.materialOptions.length > 0) {
    const cheapest = c.materialOptions.reduce((min, m) =>
      m.pricePerUnit < min.pricePerUnit ? m : min
    );
    return `From $${cheapest.pricePerUnit.toFixed(2)}/${cheapest.unit}`;
  }
  if (c.basePrice != null) return `Starting at $${c.basePrice.toFixed(2)}`;
  return null;
}

// The numeric floor behind priceLabel() above, for sorting — unpriced
// ("Call for pricing") categories sort last regardless of direction.
export function sortPriceValue(c: CategoryOption): number {
  if (c.pricingTiers.length > 0) {
    const priced = c.pricingTiers.filter((t) => t.price != null);
    return priced.length > 0 ? Math.min(...priced.map((t) => t.price as number)) : Infinity;
  }
  if (c.materialOptions.length > 0) {
    return Math.min(...c.materialOptions.map((m) => m.pricePerUnit));
  }
  return c.basePrice ?? Infinity;
}

// What's included / overage terms, in plain language — pulled straight
// from the same category pricing fields staff use to compute invoice
// overage line items, so a customer sees the real numbers before booking
// instead of finding out at pickup.
export function includedTerms(c: CategoryOption): string[] {
  const lines: string[] = [];
  if (c.includedDays != null && c.overageDayRate != null) {
    lines.push(
      `${c.includedDays} day${c.includedDays === 1 ? "" : "s"} included — after that, it's $${c.overageDayRate.toFixed(2)} for each additional day`
    );
  }
  if (c.includedTonnage != null && c.overageTonnageRate != null) {
    const perContainer =
      c.bundleQuantity > 1 && c.includedTonnage % c.bundleQuantity === 0
        ? ` (${c.includedTonnage / c.bundleQuantity} tons per container)`
        : "";
    lines.push(
      `Included: first ${c.includedTonnage} ton${c.includedTonnage === 1 ? "" : "s"} (${(c.includedTonnage * 2000).toLocaleString()} lbs)${perContainer} and first dump at no extra charge`
    );
  }
  if (c.includedMileage != null && c.overageMileageRate != null) {
    lines.push(
      `${c.includedMileage} mile${c.includedMileage === 1 ? "" : "s"} of delivery included — after that, it's $${c.overageMileageRate.toFixed(2)} for each additional mile`
    );
  }
  if (c.includedTonnage != null && c.overageTonnageRate != null) {
    lines.push(
      `Weight overage: $${c.overageTonnageRate.toFixed(2)} per ton over ${c.includedTonnage} ton${c.includedTonnage === 1 ? "" : "s"} — you'll be notified with documentation before collection`
    );
    lines.push(
      "Extra dump: an additional dump restarts your rental period (priced for the additional days you keep it)"
    );
  }
  if (c.pricingTiers.length > 0) {
    const maxDays = Math.max(...c.pricingTiers.map((t) => t.days));
    lines.push(
      `Max rental length: ${maxDays} days — need it longer? That's treated as a new rental period.`
    );
  }
  if (c.securityDepositAmount != null && c.securityDepositAmount > 0) {
    lines.push(
      `A refundable $${c.securityDepositAmount.toFixed(2)} security deposit is included in the total below, and returned after your rental.`
    );
  }
  return lines;
}

// Short blurb shown under each duration tier on the review step, matching
// Chase's real rate-card copy — computed from the same tonnage/bundle
// fields rather than stored per tier, so it can't drift out of sync with
// the actual included allowance.
export function deliveryCaption(c: CategoryOption): string {
  if (c.includedTonnage == null) return "Delivered to your door.";
  if (c.bundleQuantity > 1) {
    const perContainer =
      c.includedTonnage % c.bundleQuantity === 0 ? c.includedTonnage / c.bundleQuantity : null;
    return perContainer != null
      ? `${c.bundleQuantity} containers delivered. First ${perContainer} ton${perContainer === 1 ? "" : "s"} & first dump per can.`
      : `${c.bundleQuantity} containers delivered. First dump per can included.`;
  }
  return `Delivered to your door. First ${c.includedTonnage} ton${c.includedTonnage === 1 ? "" : "s"} & first dump included.`;
}
