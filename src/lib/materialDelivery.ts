// Pricing rules for material delivery (mulch, gravel, sand, etc.), matching
// section 2.8 of the service agreement: a $100 minimum delivery charge on
// every order, a per-material custom-quote threshold (20 yards of bulk
// material, or 10 tons of heavy material), and a mileage surcharge beyond
// the standard 30-mile delivery radius.
export type MaterialDeliveryQuote = {
  materialTotal: number;
  deliveryFee: number;
  mileageFee: number;
  total: number;
  isCustomQuote: boolean;
  note: string;
};

const MINIMUM_DELIVERY_FEE = 100;
const STANDARD_DELIVERY_MILES = 30;
const OVERAGE_MILE_RATE = 3.5;

// Bulk materials (mulch, soil, sand) are sold by the yard and top out at
// 20; heavy materials (gravel, rock) are sold by the ton and top out at 10
// — per the agreement. Units outside those two (e.g. bales) have no
// agreement-defined threshold, so they're never auto-flagged for a custom
// quote here.
function customQuoteThreshold(unit: string): number | null {
  const normalized = unit.trim().toLowerCase();
  if (normalized.startsWith("ton")) return 10;
  if (normalized.startsWith("yd") || normalized.startsWith("yard")) return 20;
  return null;
}

export function quoteMaterialDelivery(
  pricePerUnit: number,
  quantity: number,
  unit: string = "unit",
  // One-way driving-line distance from the yard to the delivery address, in
  // miles. Unknown (e.g. address not yet geocoded) means no mileage
  // surcharge is applied — better to under-quote than block a booking on a
  // geocoding hiccup.
  oneWayMiles: number | null = null
): MaterialDeliveryQuote {
  const materialTotal = pricePerUnit * quantity;
  const threshold = customQuoteThreshold(unit);

  if (threshold !== null && quantity > threshold) {
    return {
      materialTotal,
      deliveryFee: 0,
      mileageFee: 0,
      total: materialTotal,
      isCustomQuote: true,
      note: `Custom quote for orders over ${threshold} ${unit} — we'll confirm final pricing before delivery.`,
    };
  }

  const extraMiles = oneWayMiles !== null ? Math.max(0, oneWayMiles - STANDARD_DELIVERY_MILES) : 0;
  const mileageFee = extraMiles * OVERAGE_MILE_RATE;
  const deliveryFee = MINIMUM_DELIVERY_FEE + mileageFee;
  const total = materialTotal + deliveryFee;

  const noteParts = [`$${MINIMUM_DELIVERY_FEE} minimum delivery charge.`];
  if (mileageFee > 0) {
    noteParts.push(
      `+$${OVERAGE_MILE_RATE.toFixed(2)}/mi for ${extraMiles.toFixed(1)} mi beyond the ${STANDARD_DELIVERY_MILES}-mile standard delivery area.`
    );
  }

  return {
    materialTotal,
    deliveryFee,
    mileageFee,
    total,
    isCustomQuote: false,
    note: noteParts.join(" "),
  };
}
