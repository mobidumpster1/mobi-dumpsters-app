export const LEAD_SOURCE_LABELS: Record<string, string> = {
  google_ads: "Google Ads",
  meta_ads: "Facebook / Instagram Ads",
  b2b_outreach: "B2B Outreach (Leads)",
  referral: "Referral",
  organic_search: "Organic Search",
  repeat: "Repeat Customer",
  other: "Other",
};

// Maps the ?utm_source= value captured off an ad click (see UtmCapture.tsx)
// to one of our lead source buckets. Returns null for anything unrecognized
// or absent, rather than guessing — "Other" is reserved for a value that
// was genuinely captured but doesn't match a known ad platform.
export function mapUtmSourceToLeadSource(utmSource: string | null | undefined): string | null {
  if (!utmSource) return null;
  const value = utmSource.toLowerCase();
  if (value.includes("google")) return "google_ads";
  if (["facebook", "instagram", "meta", "fb", "ig"].some((v) => value.includes(v))) {
    return "meta_ads";
  }
  return "other";
}
