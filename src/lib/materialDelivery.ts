// Pricing rules Chase settled on for material delivery (mulch, gravel,
// sand, etc.), where cost genuinely varies by quantity ordered rather than
// rental duration: small orders (<=3 units) pay a flat $50 delivery fee
// with a $100 minimum total order; medium orders (4-10) have delivery
// folded into the per-unit price; large orders (10+) are a custom quote
// rather than an auto-computed number, since Chase may want to discount
// per material rather than apply one flat rule.
export type MaterialDeliveryQuote = {
  materialTotal: number;
  deliveryFee: number;
  total: number;
  isCustomQuote: boolean;
  note: string;
};

export function quoteMaterialDelivery(
  pricePerUnit: number,
  quantity: number
): MaterialDeliveryQuote {
  const materialTotal = pricePerUnit * quantity;

  if (quantity > 10) {
    return {
      materialTotal,
      deliveryFee: 0,
      total: materialTotal,
      isCustomQuote: true,
      note: "Custom quote for 10+ units — we'll confirm final pricing before delivery.",
    };
  }

  if (quantity > 3) {
    return {
      materialTotal,
      deliveryFee: 0,
      total: materialTotal,
      isCustomQuote: false,
      note: "Delivery included.",
    };
  }

  const rawTotal = materialTotal + 50;
  const total = Math.max(rawTotal, 100);
  return {
    materialTotal,
    deliveryFee: total - materialTotal,
    total,
    isCustomQuote: false,
    note:
      total > rawTotal
        ? "$50 delivery fee, bumped up to the $100 order minimum."
        : "$50 delivery fee.",
  };
}
