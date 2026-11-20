import { db } from "@/lib/db";

// A calm slate used until a business picks its own color.
export const NEUTRAL_BRAND_COLOR = "#2f3e46";

export type OrgBranding = {
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
  primaryColorDark: string;
};

// Darkens a hex color by a fixed factor — used to derive a "-dark" hover/
// active shade from an org's single chosen primary color, mirroring the
// brand/brand-dark pair the static config used to hardcode.
function darken(hex: string, factor = 0.78): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return hex;
  const r = Math.round(((num >> 16) & 0xff) * factor);
  const g = Math.round(((num >> 8) & 0xff) * factor);
  const b = Math.round((num & 0xff) * factor);
  const clamp = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`;
}

// Resolves an organization's visual identity. A business that hasn't set a
// logo or color gets no logo (its name is shown instead) and a neutral color,
// never another business's.
export async function getOrgBranding(organizationId: string): Promise<OrgBranding> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, logoUrl: true, primaryColor: true },
  });
  if (!org) throw new Error("Organization not found");

  const logoUrl = org.logoUrl;
  const primaryColor = org.primaryColor || NEUTRAL_BRAND_COLOR;

  return {
    businessName: org.name,
    logoUrl,
    primaryColor,
    primaryColorDark: darken(primaryColor),
  };
}
