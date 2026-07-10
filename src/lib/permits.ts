export const PERMIT_STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  approved: "Approved",
  denied: "Denied",
};

// Simple case-insensitive substring match — good enough to flag "this
// address is probably in Byron" without needing real address parsing.
export function matchesPermitArea(address: string, areas: { name: string }[]): boolean {
  const lower = address.toLowerCase();
  return areas.some((area) => lower.includes(area.name.toLowerCase()));
}
