export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  insurance: "Insurance Policy",
  vehicle_registration: "Vehicle Registration",
  dot_filing: "DOT Filing",
  business_license: "Business License",
  other: "Other",
};

// The Dispatch dashboard banner only shows documents inside this window —
// the 30/14/7-day tiers from the spec are all within it, expressed as
// color escalation in documentUrgency() rather than three separate lists.
export const DOCUMENT_EXPIRY_ALERT_DAYS = 30;

// expiresOn is a date-only field (from <input type="date">, stored as UTC
// midnight via `new Date("YYYY-MM-DD")`) — comparing it against local
// midnight would shift the displayed day depending on the server/browser
// timezone, so "today" here is UTC midnight too. See src/lib/date.ts.
export function utcStartOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function documentUrgency(expiresOn: Date, today: Date) {
  const diffDays = Math.round((expiresOn.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) {
    return { text: `Expired ${Math.abs(diffDays)}d ago`, className: "text-red-700 font-semibold" };
  }
  if (diffDays <= 7) {
    return { text: `Expires in ${diffDays}d`, className: "text-red-600 font-semibold" };
  }
  if (diffDays <= 14) {
    return { text: `Expires in ${diffDays}d`, className: "text-orange-600 font-semibold" };
  }
  return { text: `Expires in ${diffDays}d`, className: "text-amber-600 font-semibold" };
}
