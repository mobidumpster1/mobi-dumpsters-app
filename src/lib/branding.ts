import brandingConfig from "../../config/branding.json";

// All business identity (name, logo, colors, contact info) lives in
// config/branding.json so this codebase can be reused for other rental
// businesses without touching any component code.
export type Branding = {
  businessName: string;
  tagline: string;
  logoPath: string;
  phone: string;
  email: string;
  address: string;
  primaryColor: string;
  accentColor: string;
  facebookPageUrl?: string;
};

export const branding: Branding = brandingConfig;
