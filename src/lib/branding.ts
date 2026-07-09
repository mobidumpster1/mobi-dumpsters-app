import brandingConfig from "../../config/branding.json";

// All business identity (name, logo, colors, contact info) lives in
// config/branding.json so this codebase can be reused for other rental
// businesses without touching any component code.
export type Branding = {
  businessName: string;
  tagline: string;
  logoPath: string;
  phone: string;
  // Number shown in customer-facing "call or text" messaging (emails, the
  // rental-management page) — separate from `phone` since that one's also
  // used on public marketing/legal pages where a personal cell isn't wanted.
  smsPhone: string;
  email: string;
  address: string;
  // Where equipment sits by default when not out on a job — geocoded once
  // and stored here (rather than re-geocoding on every page load) since it
  // never changes.
  yardAddress: string;
  yardLatitude: number;
  yardLongitude: number;
  primaryColor: string;
  accentColor: string;
  facebookPageUrl?: string;
};

export const branding: Branding = brandingConfig;
