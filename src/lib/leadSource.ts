export const LEAD_SOURCE_LABELS: Record<string, string> = {
  google_ads: "Google Ads",
  google_business_profile: "Google Business Profile",
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
// was genuinely captured but doesn't match a known ad platform. Checked
// before the generic "google" match below so the free Business Profile
// listing doesn't get lumped in with paid Google Ads spend.
export function mapUtmSourceToLeadSource(utmSource: string | null | undefined): string | null {
  if (!utmSource) return null;
  const value = utmSource.toLowerCase();
  if (["gbp", "google_business_profile", "google_business", "gmb"].includes(value)) {
    return "google_business_profile";
  }
  if (value.includes("google")) return "google_ads";
  if (["facebook", "instagram", "meta", "fb", "ig"].some((v) => value.includes(v))) {
    return "meta_ads";
  }
  return "other";
}
