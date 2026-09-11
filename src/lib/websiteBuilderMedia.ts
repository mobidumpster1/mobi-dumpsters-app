// Client-safe: types + pure luminance math only, same split as
// websiteBuilderTheme.ts (no `db`/`fluent-ffmpeg` import here — those are
// server-only, see src/app/api/transcode-video/route.ts).

export type Overlay = {
  color: string;
  opacity: number; // 0-100
  gradient: boolean; // false = flat scrim, true = top-transparent to bottom-color
};

export type SectionBackground =
  | { type: "color" }
  | { type: "image"; imageUrl: string; imageWidth: number; imageHeight: number; overlay: Overlay; textShadow: boolean }
  | {
      type: "video";
      videoUrl: string;
      webmUrl: string;
      posterUrl: string;
      posterWidth: number;
      posterHeight: number;
      fileSizeBytes: number;
      playOnMobile: boolean;
      overlay: Overlay;
      textShadow: boolean;
    };

export const DEFAULT_OVERLAY: Overlay = { color: "#000000", opacity: 40, gradient: false };

export function defaultBackground(): SectionBackground {
  return { type: "color" };
}

export function overlayCss(overlay: Overlay): string {
  const alpha = Math.max(0, Math.min(100, overlay.opacity)) / 100;
  const rgba = hexToRgba(overlay.color, alpha);
  if (!overlay.gradient) return rgba;
  return `linear-gradient(to bottom, ${hexToRgba(overlay.color, 0)}, ${rgba})`;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return `rgba(0,0,0,${alpha})`;
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}

// Blends a sampled background luminance (0-1, from an offscreen canvas read
// of the poster/image) with the overlay on top of it, so the contrast
// warning reflects what a viewer actually sees, not the raw photo.
export function luminanceWithOverlay(bgLuminance: number, overlay: Overlay): number {
  const alpha = Math.max(0, Math.min(100, overlay.opacity)) / 100;
  const overlayLuminance = hexRelativeLuminance(overlay.color);
  // Gradient scrim is darkest at the bottom (where text usually sits) —
  // approximate the blended region as the flat-scrim case at full opacity,
  // a reasonable (slightly conservative) stand-in for "the part behind the
  // text," without needing to know exact text position.
  const effectiveAlpha = overlay.gradient ? Math.min(1, alpha * 1.2) : alpha;
  return bgLuminance * (1 - effectiveAlpha) + overlayLuminance * effectiveAlpha;
}

function hexRelativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return 0;
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = channel((num >> 16) & 0xff);
  const g = channel((num >> 8) & 0xff);
  const b = channel(num & 0xff);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Contrast ratio between an already-blended background luminance (0-1,
// from luminanceWithOverlay) and a hex text color — same WCAG formula as
// websiteBuilderTheme.ts's contrastRatio, adapted to take a luminance
// directly since the background here is a sampled image, not a flat color.
export function contrastAgainstLuminance(bgLuminance: number, textHex: string): number {
  const textLuminance = hexRelativeLuminance(textHex);
  const lA = bgLuminance + 0.05;
  const lB = textLuminance + 0.05;
  return lA > lB ? lA / lB : lB / lA;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
