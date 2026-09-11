// Client-safe: types + pure color/font math only, same split as
// websiteSections.ts (no `db` import here).
//
// One page-level theme drives every section AND every Free Layout block —
// see the "Brand colors" plan. Only brandColor has an existing hook
// (--rt-brand/--rt-brand-dark, which bg-brand/text-brand already resolve
// through — see globals.css); accentColor/textColor/surfaceColor are new,
// applied as plain CSS custom properties by themeToCssVars.

import { fontStack, type FontRole } from "@/lib/websiteBuilderFonts";

export type PageTheme = {
  brandColor: string;
  accentColor: string;
  textColor: string;
  surfaceColor: string;
  fontPairingId: string;
};

export type FontPairing = {
  id: string;
  label: string;
  display: FontRole;
  body: FontRole;
};

// 12 curated pairings built from a shared font pool, so most pairings reuse
// a family in a different role rather than needing a unique face each —
// same "small curated set, not infinite pickers" idea as the six starter
// templates before this.
export const FONT_PAIRINGS: FontPairing[] = [
  { id: "modern", label: "Modern", display: "archivo", body: "sourceSans" },
  { id: "timeless", label: "Timeless", display: "playfair", body: "sourceSans" },
  { id: "bold", label: "Bold", display: "spaceGrotesk", body: "inter" },
  { id: "friendly", label: "Friendly", display: "poppins", body: "nunito" },
  { id: "editorial", label: "Editorial", display: "fraunces", body: "workSans" },
  { id: "trade", label: "Trade", display: "bitter", body: "inter" },
  { id: "minimal", label: "Minimal", display: "inter", body: "inter" },
  { id: "warmSerif", label: "Warm Serif", display: "lora", body: "nunito" },
  { id: "corporate", label: "Corporate", display: "montserrat", body: "sourceSans" },
  { id: "classicBook", label: "Classic Book", display: "libreBaskerville", body: "workSans" },
  { id: "technical", label: "Technical", display: "spaceGrotesk", body: "jetbrainsMono" },
  { id: "grotesk", label: "Grotesk", display: "dmSans", body: "dmSans" },
];

const DEFAULT_FONT_PAIRING_ID = "modern";
const DEFAULT_ACCENT = "#0f766e";
const DEFAULT_TEXT = "#1c211a";
const DEFAULT_SURFACE = "#ffffff";

// Called with the org's real branding color (getOrgBranding) so a page
// that's never had its theme touched starts matching the business's
// existing brand instead of a hardcoded generic green.
export function makeDefaultTheme(brandColor: string): PageTheme {
  return {
    brandColor,
    accentColor: DEFAULT_ACCENT,
    textColor: DEFAULT_TEXT,
    surfaceColor: DEFAULT_SURFACE,
    fontPairingId: DEFAULT_FONT_PAIRING_ID,
  };
}

function getFontPairing(id: string): FontPairing {
  return FONT_PAIRINGS.find((f) => f.id === id) ?? FONT_PAIRINGS[0];
}

// Same darken() shape as src/lib/orgBranding.ts, duplicated rather than
// imported — that file pulls in `db` (Node-only), and this module is
// imported into client bundles (SectionEditor, BrandPanel), so it can't
// depend on a server-only module. See the RSC client/server boundary note
// in project memory for why that split matters here.
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

function lighten(hex: string, factor = 0.85): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return hex;
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const mix = (channel: number) => Math.round(channel + (255 - channel) * factor);
  const clamp = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
  return `#${clamp(mix(r))}${clamp(mix(g))}${clamp(mix(b))}`;
}

// Picks white or the theme's dark text color for a label sitting on top of
// a brand/accent-colored surface (a button), whichever gives better
// contrast — same idea as contrastRatio below, applied automatically
// instead of asking the user to pick a fifth color.
function readableLabelColor(backgroundHex: string, darkTextHex: string): string {
  return contrastRatio(backgroundHex, "#ffffff") >= contrastRatio(backgroundHex, darkTextHex)
    ? "#ffffff"
    : darkTextHex;
}

// One brand color and one accent color in, a coherent set of hover/border/
// subtle-fill/muted-text shades out — the user picks 2-4 colors, not a
// panel of a dozen swatches.
export function deriveThemeTokens(theme: PageTheme): Record<string, string> {
  const pairing = getFontPairing(theme.fontPairingId);
  return {
    "--rt-brand": theme.brandColor,
    "--rt-brand-dark": darken(theme.brandColor),
    "--pt-brand-subtle": lighten(theme.brandColor, 0.88),
    "--pt-brand-on": readableLabelColor(theme.brandColor, theme.textColor),
    "--pt-accent": theme.accentColor,
    "--pt-accent-dark": darken(theme.accentColor),
    "--pt-accent-on": readableLabelColor(theme.accentColor, theme.textColor),
    "--pt-text": theme.textColor,
    "--pt-text-muted": lighten(theme.textColor, 0.45),
    "--pt-surface": theme.surfaceColor,
    "--pt-surface-alt": darken(theme.surfaceColor, 0.97),
    "--pt-font-display": fontStack(pairing.display),
    "--pt-font-body": fontStack(pairing.body),
  };
}

export function themeToCssVars(theme: PageTheme): React.CSSProperties {
  return deriveThemeTokens(theme) as React.CSSProperties;
}

// WCAG relative-luminance contrast ratio between two hex colors — used for
// the Brand panel's inline (non-blocking) readability warnings.
function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return 1;
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = channel((num >> 16) & 0xff);
  const g = channel((num >> 8) & 0xff);
  const b = channel(num & 0xff);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA) + 0.05;
  const lB = relativeLuminance(hexB) + 0.05;
  return lA > lB ? lA / lB : lB / lA;
}

export const WCAG_AA_NORMAL = 4.5;
export const WCAG_AA_LARGE = 3;
