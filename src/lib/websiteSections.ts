// Client-safe: types + pure registry/helpers only, same split as
// websiteBuilder.ts/websiteBuilderPage.ts (no `db` import here).
//
// The page is one ordered list of sections — normal sections stack top to
// bottom (no x/y/width/height, so they can't come out broken on mobile),
// plus one special section type, "freeCanvas", that contains the old
// free-position block editor as a self-contained, bounded band instead of
// a parallel page. Each normal section type is one entry in
// SECTION_REGISTRY; its property panel is generated from `fields` instead
// of hand-built per type, same descriptor-driven-form idea as
// FieldDefinition in categoryFields.ts (custom fields), just adapted for
// content types instead of data types. freeCanvas deliberately has no
// `fields` — its "form" is the canvas editor itself (see
// SectionEditor.tsx / CanvasRenderer.tsx / BlockInspector.tsx), not a
// field list, so it's registered separately from SECTION_REGISTRY.

import type { Block } from "@/lib/websiteBuilder";

export type SectionPropFieldType = "text" | "longtext" | "image" | "link";

export type SectionPropField = {
  key: string;
  label: string;
  type: SectionPropFieldType;
  placeholder?: string;
};

// The five "normal" (schema-driven, no free positioning) section types.
export type NormalSectionType = "hero" | "ctaBanner" | "inventoryGrid" | "pricingTable" | "bookingWidget";

export type NormalSectionInstance = {
  id: string;
  type: NormalSectionType;
  props: Record<string, string>;
};

// A bounded free-position canvas, contained as one section in the page
// stack — reorderable/deletable/hideable like any other section, but its
// content is the old block editor's blocks array instead of a field form.
// designWidth/height are the size the layout was actually designed at;
// below designWidth the whole band scales down as one unit (see
// FreeCanvasBand.tsx) rather than reflowing, since free-positioned blocks
// can't reflow without breaking.
export type FreeCanvasSectionInstance = {
  id: string;
  type: "freeCanvas";
  props: {
    designWidth: number;
    height: number;
    blocks: Block[];
  };
};

export type SectionType = NormalSectionType | "freeCanvas";
export type SectionInstance = NormalSectionInstance | FreeCanvasSectionInstance;

export type SectionDefinition = {
  type: NormalSectionType;
  label: string;
  icon: string;
  description: string;
  fields: SectionPropField[];
  defaultProps: Record<string, string>;
};

export const SECTION_REGISTRY: SectionDefinition[] = [
  {
    type: "hero",
    label: "Hero",
    icon: "🏔",
    description: "A headline, a photo, and a button — the top of the page.",
    fields: [
      { key: "headline", label: "Headline", type: "text" },
      { key: "subheadline", label: "Subheadline (optional)", type: "longtext" },
      { key: "imageUrl", label: "Photo (optional)", type: "image" },
      { key: "buttonLabel", label: "Button text (optional)", type: "text" },
      { key: "buttonHref", label: "Button link (optional)", type: "link", placeholder: "tel: or https://" },
    ],
    defaultProps: {
      headline: "Book Your Rental Online",
      subheadline: "Delivered to your door, on your schedule.",
      imageUrl: "",
      buttonLabel: "Call Us",
      buttonHref: "tel:",
    },
  },
  {
    type: "ctaBanner",
    label: "CTA Banner",
    icon: "📣",
    description: "A short headline and a button — good for a mid-page nudge to call.",
    fields: [
      { key: "headline", label: "Headline", type: "text" },
      { key: "buttonLabel", label: "Button text", type: "text" },
      { key: "buttonHref", label: "Button link", type: "link", placeholder: "tel: or https://" },
    ],
    defaultProps: {
      headline: "Ready to get started?",
      buttonLabel: "Call Us",
      buttonHref: "tel:",
    },
  },
  {
    type: "inventoryGrid",
    label: "Inventory Grid",
    icon: "🗂",
    description: "Every rental type you offer, with real photos and pricing — updates itself automatically.",
    fields: [],
    defaultProps: {},
  },
  {
    type: "pricingTable",
    label: "Pricing Table",
    icon: "💲",
    description: "A detailed rate breakdown for every rental type — pulled from real pricing, never typed by hand.",
    fields: [],
    defaultProps: {},
  },
  {
    type: "bookingWidget",
    label: "Booking Widget",
    icon: "📋",
    description: "The real booking form, full-width.",
    fields: [],
    defaultProps: {},
  },
];

// Kept separate from SECTION_REGISTRY (rather than folded in with an
// empty `fields` list, the way inventoryGrid/pricingTable/bookingWidget
// have no *field-form* config) because freeCanvas isn't just "no fields
// to fill in" — it needs a structurally different editor (the canvas)
// and a structurally different default-content flow (a template picker,
// not createDefaultSection's flat defaultProps).
export const FREE_CANVAS_META = {
  type: "freeCanvas" as const,
  label: "Free Layout",
  icon: "🎨",
  description: "Drag, resize, and layer blocks freely — full control, but you're responsible for how it looks on a phone (it scales down as a unit rather than reflowing).",
};

const DEFAULT_FREE_CANVAS_WIDTH = 640;
const DEFAULT_FREE_CANVAS_HEIGHT = 800;

export function getSectionDefinition(type: NormalSectionType): SectionDefinition {
  const def = SECTION_REGISTRY.find((s) => s.type === type);
  if (!def) throw new Error(`Unknown section type: ${type}`);
  return def;
}

function newSectionId() {
  return Math.random().toString(36).slice(2, 10);
}

export function createDefaultSection(type: NormalSectionType): NormalSectionInstance {
  return { id: newSectionId(), type, props: { ...getSectionDefinition(type).defaultProps } };
}

// `blocks` defaults empty (a blank band) — the editor offers seeding it
// from the existing starter templates (TemplatePicker) as a separate step,
// not baked into this constructor, so this function stays a plain default
// like createDefaultSection above.
export function createFreeCanvasSection(
  blocks: Block[] = [],
  designWidth = DEFAULT_FREE_CANVAS_WIDTH,
  height = DEFAULT_FREE_CANVAS_HEIGHT
): FreeCanvasSectionInstance {
  return { id: newSectionId(), type: "freeCanvas", props: { designWidth, height, blocks } };
}

export function isFreeCanvasSection(section: SectionInstance): section is FreeCanvasSectionInstance {
  return section.type === "freeCanvas";
}

// Defensive parse, same reasoning as parseBlocks in websiteBuilder.ts — a
// malformed sectionsJson value should never crash the live embed.
export function parseSections(json: string): SectionInstance[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as SectionInstance[]) : [];
  } catch {
    return [];
  }
}

export function serializeSections(sections: SectionInstance[]): string {
  return JSON.stringify(sections);
}

// HTML embed blocks need the Pro plan (see FreeCanvasSectionEditor.tsx's
// palette gating). Enforced here too — both on save (sectionActions.ts)
// and again at render time (book/page.tsx), since a save gated at Pro
// doesn't protect against an org that saved HTML blocks and was later
// downgraded. Strips rather than rejects, so a downgrade never breaks
// the rest of an otherwise-fine saved page.
export function stripUngatedHtmlBlocks(sections: SectionInstance[], canUseHtml: boolean): SectionInstance[] {
  if (canUseHtml) return sections;
  return sections.map((s) =>
    isFreeCanvasSection(s) ? { ...s, props: { ...s.props, blocks: s.props.blocks.filter((b) => b.type !== "html") } } : s
  );
}
