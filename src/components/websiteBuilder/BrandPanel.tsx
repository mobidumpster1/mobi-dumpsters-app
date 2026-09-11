"use client";

import { FONT_PAIRINGS, contrastRatio, WCAG_AA_NORMAL, WCAG_AA_LARGE, type PageTheme } from "@/lib/websiteBuilderTheme";
import { fontStack } from "@/lib/websiteBuilderFonts";

const COLOR_FIELDS: { key: keyof PageTheme; label: string; hint: string }[] = [
  { key: "brandColor", label: "Brand", hint: "Buttons and highlights" },
  { key: "accentColor", label: "Accent", hint: "A second color for variety" },
  { key: "textColor", label: "Text", hint: "Headlines and body copy" },
  { key: "surfaceColor", label: "Surface", hint: "The page background" },
];

// One place, applies everywhere: edits here update `theme` live (the
// preview re-renders immediately, since every section and Free Layout
// block reads the same --pt-*/--rt-brand CSS vars this derives) and
// commit to undo history as one step per burst — see SectionEditor's
// handleThemeChange.
export function BrandPanel({
  theme,
  onChange,
  onClose,
}: {
  theme: PageTheme;
  onChange: (next: PageTheme) => void;
  onClose: () => void;
}) {
  const textVsSurface = contrastRatio(theme.textColor, theme.surfaceColor);
  const brandButtonLabel = contrastRatio("#ffffff", theme.brandColor);
  const warnings: string[] = [];
  if (textVsSurface < WCAG_AA_NORMAL) {
    warnings.push(`Body text may be hard to read against the page background (contrast ${textVsSurface.toFixed(1)}:1 — aim for ${WCAG_AA_NORMAL}:1).`);
  }
  if (brandButtonLabel < WCAG_AA_LARGE) {
    warnings.push(`Button labels may be hard to read on the brand color (contrast ${brandButtonLabel.toFixed(1)}:1 — aim for ${WCAG_AA_LARGE}:1).`);
  }

  return (
    <div className="rounded-lg border-2 border-zinc-900 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-zinc-500">Brand</h2>
          <p className="text-xs text-zinc-500">Applies to every section and Free Layout block on this page.</p>
        </div>
        <button type="button" onClick={onClose} className="text-xs font-semibold text-zinc-500 hover:underline">
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {COLOR_FIELDS.map((field) => (
          <label key={field.key} className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-zinc-500">{field.label}</span>
            <input
              type="color"
              value={theme[field.key] as string}
              onChange={(e) => onChange({ ...theme, [field.key]: e.target.value })}
              className="h-9 w-full rounded-lg border border-zinc-300"
            />
            <span className="text-[11px] text-zinc-400">{field.hint}</span>
          </label>
        ))}
      </div>

      {warnings.length > 0 && (
        <div className="mt-3 flex flex-col gap-1 rounded-lg border border-amber-300 bg-amber-50 p-2">
          {warnings.map((w) => (
            <p key={w} className="text-xs text-amber-800">
              ⚠ {w}
            </p>
          ))}
        </div>
      )}

      <p className="mb-2 mt-4 text-xs font-semibold text-zinc-500">Font pairing</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {FONT_PAIRINGS.map((pairing) => (
          <button
            key={pairing.id}
            type="button"
            onClick={() => onChange({ ...theme, fontPairingId: pairing.id })}
            className={`rounded-lg border-2 p-2 text-left transition-colors ${
              theme.fontPairingId === pairing.id ? "border-brand bg-brand-light" : "border-zinc-200 hover:border-zinc-300"
            }`}
          >
            <span className="block truncate text-base font-bold text-ink" style={{ fontFamily: fontStack(pairing.display) }}>
              {pairing.label}
            </span>
            <span className="block truncate text-xs text-zinc-500" style={{ fontFamily: fontStack(pairing.body) }}>
              Aa Bb Cc
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
