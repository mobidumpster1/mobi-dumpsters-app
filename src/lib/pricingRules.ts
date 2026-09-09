import { db } from "@/lib/db";

// Month/day are compared as a linear MMDD value so a season can wrap the
// year boundary (e.g. Nov 15 - Feb 15) without needing a real Date and its
// year to matter — the whole point of storing month/day instead of a full
// date is that the rule recurs every year without recreating it.
function isInSeason(
  date: Date,
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number
): boolean {
  const value = date.getUTCMonth() * 100 + date.getUTCDate();
  const start = (startMonth - 1) * 100 + startDay;
  const end = (endMonth - 1) * 100 + endDay;
  return start <= end ? value >= start && value <= end : value >= start || value <= end;
}

// Applied only in the public booking flow (src/app/book/actions.ts) — the
// admin booking form already lets staff type in whatever price they want
// per item, so there's no server-authoritative amount to adjust there the
// way there is for the public flow's customer-facing quote.
export async function computeSeasonalAdjustment(
  organizationId: string,
  categoryId: string,
  deliveryDate: Date,
  baseAmount: number
): Promise<{ amount: number; noteLines: string[] }> {
  const rules = await db.pricingRule.findMany({
    where: {
      organizationId,
      active: true,
      OR: [{ categoryId: null }, { categoryId }],
    },
  });

  const weekday = deliveryDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
  let amount = 0;
  const noteLines: string[] = [];

  for (const rule of rules) {
    const matchesWeekend =
      (rule.appliesSaturday && weekday === 6) || (rule.appliesSunday && weekday === 0);
    const hasSeason =
      rule.seasonStartMonth !== null &&
      rule.seasonStartDay !== null &&
      rule.seasonEndMonth !== null &&
      rule.seasonEndDay !== null;
    const matchesSeason =
      hasSeason &&
      isInSeason(
        deliveryDate,
        rule.seasonStartMonth as number,
        rule.seasonStartDay as number,
        rule.seasonEndMonth as number,
        rule.seasonEndDay as number
      );

    if (!matchesWeekend && !matchesSeason) continue;

    const ruleAmount =
      rule.adjustmentType === "percent" ? baseAmount * (rule.adjustmentValue / 100) : rule.adjustmentValue;
    amount += ruleAmount;
    noteLines.push(`${rule.name}: +$${ruleAmount.toFixed(2)}`);
  }

  return { amount, noteLines };
}
