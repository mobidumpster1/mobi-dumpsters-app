export const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
  oil_change: "Oil Change",
  tire_rotation: "Tire Rotation",
  repair: "Repair",
  inspection: "Inspection",
  other: "Other",
};

// The Dispatch dashboard banner only shows entries inside this window,
// expressed as color escalation in maintenanceUrgency() — same convention
// as DOCUMENT_EXPIRY_ALERT_DAYS/documentUrgency in src/lib/documents.ts.
export const MAINTENANCE_DUE_ALERT_DAYS = 30;

export function maintenanceUrgency(nextServiceDue: Date, today: Date) {
  const diffDays = Math.round((nextServiceDue.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) {
    return { text: `Overdue ${Math.abs(diffDays)}d`, className: "text-red-700 font-semibold" };
  }
  if (diffDays <= 7) {
    return { text: `Due in ${diffDays}d`, className: "text-red-600 font-semibold" };
  }
  if (diffDays <= 14) {
    return { text: `Due in ${diffDays}d`, className: "text-orange-600 font-semibold" };
  }
  return { text: `Due in ${diffDays}d`, className: "text-amber-600 font-semibold" };
}
