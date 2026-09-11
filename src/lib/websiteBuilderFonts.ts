import {
  Archivo,
  Source_Sans_3,
  Playfair_Display,
  Space_Grotesk,
  Inter,
  Poppins,
  Nunito,
  Fraunces,
  Work_Sans,
  Bitter,
  Lora,
  Montserrat,
  Libre_Baskerville,
  JetBrains_Mono,
  DM_Sans,
} from "next/font/google";

// Every font a theme pairing can reference, loaded once here (self-hosted at
// build time by next/font — no runtime request, no external stylesheet).
// Only imported by the two page-level wrappers (website-builder/page.tsx,
// book/page.tsx) that render themed content; leaf renderers just reference
// the generic --pt-font-display/--pt-font-body vars these resolve into, so
// they never need to know which of the 12 pairings is active.
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-source-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-poppins" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans" });
const bitter = Bitter({ subsets: ["latin"], variable: "--font-bitter" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat" });
const libreBaskerville = Libre_Baskerville({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-libre-baskerville" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

const ALL_FONTS = [
  archivo, sourceSans, playfair, spaceGrotesk, inter, poppins, nunito, fraunces,
  workSans, bitter, lora, montserrat, libreBaskerville, jetbrainsMono, dmSans,
];

// Applied once on the same wrapper element that carries the --pt-* theme
// vars, so every pairing's CSS variable is available for --pt-font-display/
// --pt-font-body to resolve into, regardless of which one is selected.
export const FONT_VARIABLES_CLASS = ALL_FONTS.map((f) => f.variable).join(" ");

const FONT_CSS_VAR: Record<string, string> = {
  archivo: "var(--font-archivo)",
  sourceSans: "var(--font-source-sans)",
  playfair: "var(--font-playfair)",
  spaceGrotesk: "var(--font-space-grotesk)",
  inter: "var(--font-inter)",
  poppins: "var(--font-poppins)",
  nunito: "var(--font-nunito)",
  fraunces: "var(--font-fraunces)",
  workSans: "var(--font-work-sans)",
  bitter: "var(--font-bitter)",
  lora: "var(--font-lora)",
  montserrat: "var(--font-montserrat)",
  libreBaskerville: "var(--font-libre-baskerville)",
  jetbrainsMono: "var(--font-jetbrains-mono)",
  dmSans: "var(--font-dm-sans)",
};

export type FontRole = keyof typeof FONT_CSS_VAR;

const SANS_FALLBACK = "ui-sans-serif, system-ui, sans-serif";
const SERIF_FALLBACK = "ui-serif, Georgia, serif";
const MONO_FALLBACK = "ui-monospace, 'SF Mono', monospace";

const FALLBACK_BY_FONT: Partial<Record<FontRole, string>> = {
  playfair: SERIF_FALLBACK,
  fraunces: SERIF_FALLBACK,
  bitter: SERIF_FALLBACK,
  lora: SERIF_FALLBACK,
  libreBaskerville: SERIF_FALLBACK,
  jetbrainsMono: MONO_FALLBACK,
};

export function fontStack(font: FontRole): string {
  return `${FONT_CSS_VAR[font]}, ${FALLBACK_BY_FONT[font] ?? SANS_FALLBACK}`;
}
