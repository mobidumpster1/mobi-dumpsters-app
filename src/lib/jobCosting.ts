export const JOB_COSTING_DEFAULT_THRESHOLD = 20;

export type JobMargin = {
  profit: number;
  // Null when there's no revenue to divide by (job hasn't been invoiced
  // yet) — callers should treat that as "not enough data" rather than 0%.
  marginPercent: number | null;
};

export function computeJobMargin(revenue: number, cost: number): JobMargin {
  const profit = revenue - cost;
  const marginPercent = revenue > 0 ? (profit / revenue) * 100 : null;
  return { profit, marginPercent };
}

export function marginStyle(marginPercent: number | null, thresholdPercent: number): string {
  if (marginPercent === null) return "bg-zinc-400 text-white";
  if (marginPercent < thresholdPercent) return "bg-red-600 text-white font-black";
  if (marginPercent < thresholdPercent + 10) return "bg-amber-500 text-white font-black";
  return "bg-green-600 text-white font-black";
}
