import { existsSync } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { branding } from "@/lib/branding";

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

// Resolves an organization's visual identity, falling back to the static
// config/branding.json values for anything the org hasn't customized yet —
// so existing organizations (e.g. Mobi Dumpsters LLC) keep looking exactly
// as they do today until an owner actively sets their own logo/color.
export async function getOrgBranding(organizationId: string): Promise<OrgBranding> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, logoUrl: true, primaryColor: true },
  });
  if (!org) throw new Error("Organization not found");

  let logoUrl = org.logoUrl;
  if (!logoUrl && existsSync(path.join(process.cwd(), "public", branding.logoPath))) {
    logoUrl = branding.logoPath;
  }

  const primaryColor = org.primaryColor || branding.primaryColor;

  return {
    businessName: org.name,
    logoUrl,
    primaryColor,
    primaryColorDark: darken(primaryColor),
  };
}
