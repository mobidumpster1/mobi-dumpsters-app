// Client-safe: types + pure registry/helpers only, same split as
// websiteBuilder.ts/websiteBuilderPage.ts (no `db` import here).
//
// The section-based alternative to the free-position canvas — sections
// stack vertically in document order (no x/y/width/height), so a page
// built from them can't come out broken on mobile. Each section type is
// one entry in SECTION_REGISTRY; its property panel is generated from
// `fields` instead of hand-built per type, same descriptor-driven-form
// idea as FieldDefinition in categoryFields.ts (custom fields), just
// adapted for content types instead of data types.

export type SectionPropFieldType = "text" | "longtext" | "image" | "link";

export type SectionPropField = {
  key: string;
  label: string;
  type: SectionPropFieldType;
  placeholder?: string;
};

export type SectionType = "hero" | "ctaBanner" | "inventoryGrid" | "pricingTable" | "bookingWidget";

export type SectionInstance = {
  id: string;
  type: SectionType;
  props: Record<string, string>;
};

export type SectionDefinition = {
  type: SectionType;
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

export function getSectionDefinition(type: SectionType): SectionDefinition {
  const def = SECTION_REGISTRY.find((s) => s.type === type);
  if (!def) throw new Error(`Unknown section type: ${type}`);
  return def;
}

function newSectionId() {
  return Math.random().toString(36).slice(2, 10);
}

export function createDefaultSection(type: SectionType): SectionInstance {
  return { id: newSectionId(), type, props: { ...getSectionDefinition(type).defaultProps } };
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
