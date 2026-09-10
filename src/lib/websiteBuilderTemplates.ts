import { newBlockId, type Block } from "@/lib/websiteBuilder";

export type WebsiteBuilderTemplate = {
  id: string;
  name: string;
  description: string;
  canvasWidth: number;
  canvasHeight: number;
  blocks: Block[];
};

// Fixed starter layouts — the "presets" a business owner picks from
// instead of starting on a blank canvas, same idea as a GoDaddy/Wix
// template gallery. Everything here is just editable starting content;
// there's no separate "template mode" — picking one just populates the
// normal block editor. Kept small and fixed for now (no saving a custom
// template, no marketplace) per the V1 scope boundary.
export const WEBSITE_BUILDER_TEMPLATES: WebsiteBuilderTemplate[] = [
  {
    id: "simple",
    name: "Simple",
    description: "Just a headline and the booking form — clean and to the point.",
    canvasWidth: 640,
    canvasHeight: 800,
    blocks: [
      { id: "t", type: "text", x: 20, y: 20, width: 600, height: 50, content: "Book Your Rental Online", fontSize: 26, color: "#1a1a1a", bold: true, align: "center" },
      { id: "b", type: "bookingWidget", x: 20, y: 90, width: 600, height: 690 },
    ],
  },
  {
    id: "classic",
    name: "Classic",
    description: "A headline, a short line about your business, and a call button above the booking form.",
    canvasWidth: 640,
    canvasHeight: 860,
    blocks: [
      { id: "t1", type: "text", x: 20, y: 20, width: 600, height: 40, content: "Fast, Reliable Rentals", fontSize: 24, color: "#1a1a1a", bold: true, align: "center" },
      { id: "t2", type: "text", x: 20, y: 65, width: 600, height: 30, content: "Delivered to your door, on your schedule.", fontSize: 15, color: "#52525b", bold: false, align: "center" },
      { id: "btn", type: "button", x: 220, y: 105, width: 200, height: 44, label: "Call Us", href: "tel:", color: "#3f6b2f" },
      { id: "b", type: "bookingWidget", x: 20, y: 165, width: 600, height: 675 },
    ],
  },
  {
    id: "bold",
    name: "Bold",
    description: "A colored header band behind your headline, for a more branded look.",
    canvasWidth: 640,
    canvasHeight: 880,
    blocks: [
      { id: "shape", type: "shape", x: 0, y: 0, width: 640, height: 130, color: "#3f6b2f" },
      { id: "t", type: "text", x: 20, y: 40, width: 600, height: 50, content: "Request a Rental Today", fontSize: 28, color: "#ffffff", bold: true, align: "center" },
      { id: "btn", type: "button", x: 220, y: 150, width: 200, height: 44, label: "Call Us", href: "tel:", color: "#3f6b2f" },
      { id: "b", type: "bookingWidget", x: 20, y: 210, width: 600, height: 660 },
    ],
  },
];

// Fresh ids each time a template is applied (see newBlockId's doc comment).
export function instantiateTemplate(template: WebsiteBuilderTemplate): Block[] {
  return template.blocks.map((block) => ({ ...block, id: newBlockId() }));
}
