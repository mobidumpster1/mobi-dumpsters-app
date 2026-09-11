// Client-safe: types + pure block helpers only. Deliberately no `db`
// import here — this module is pulled into the client bundle by
// FreeCanvasSectionEditor.tsx, and `src/lib/db.ts` uses Node-only APIs
// (node:async_hooks) that can't ship to the browser. The one function that
// actually touches the database (getWebsiteBuilderPage) lives in
// websiteBuilderPage.ts instead, imported only from server components.

// Omitted entirely (not shown scaled-down-to-unreadable) once a
// free-canvas band is narrower than its designWidth — see
// FreeCanvasBand.tsx. Optional on every block type, toggled in
// BlockInspector.tsx.
type MobileVisibility = { hideOnMobile?: boolean };

export type TextBlock = {
  id: string;
  type: "text";
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize: number;
  color: string;
  bold: boolean;
  align: "left" | "center" | "right";
} & MobileVisibility;

export type ImageBlock = {
  id: string;
  type: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  url: string | null;
  alt: string;
} & MobileVisibility;

export type ButtonBlock = {
  id: string;
  type: "button";
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  href: string;
  color: string;
} & MobileVisibility;

export type ShapeBlock = {
  id: string;
  type: "shape";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
} & MobileVisibility;

// A raw-HTML embed, same idea as Wix's "Embed Code" widget — for a
// business owner who has a snippet from somewhere else (a review widget,
// a map embed, a hand-written banner) and just wants to drop it in.
// Rendered inside a sandboxed iframe (see CanvasRenderer) so it can never
// break out and affect the rest of the page's styles/scripts.
export type HtmlBlock = {
  id: string;
  type: "html";
  x: number;
  y: number;
  width: number;
  height: number;
  html: string;
} & MobileVisibility;

// No configurable props — it's a fixed feature block that renders the real
// booking flow (BookingForm) sized to whatever box it's given. Position/
// size are the only things about it a business owner can control.
export type BookingWidgetBlock = {
  id: string;
  type: "bookingWidget";
  x: number;
  y: number;
  width: number;
  height: number;
} & MobileVisibility;

export type Block = TextBlock | ImageBlock | ButtonBlock | ShapeBlock | BookingWidgetBlock | HtmlBlock;

// Exported so websiteBuilderTemplates.ts can assign fresh ids when a
// starter template is applied, rather than reusing the same fixed ids
// every time (harmless since one set always replaces the other, but
// avoids ever having two blocks share an id even transiently).
export function newBlockId() {
  return Math.random().toString(36).slice(2, 10);
}

// Sensible starting size/position for a block just added from the palette —
// centered-ish, sized to be immediately visible and useful without the
// business owner having to resize before they can tell what they added.
export function createDefaultBlock(type: Block["type"], canvasWidth: number): Block {
  const id = newBlockId();
  const x = Math.max(20, Math.round(canvasWidth / 2 - 140));
  switch (type) {
    case "text":
      return { id, type, x, y: 20, width: 280, height: 60, content: "Your text here", fontSize: 20, color: "#1a1a1a", bold: false, align: "left" };
    case "image":
      return { id, type, x, y: 20, width: 280, height: 180, url: null, alt: "" };
    case "button":
      return { id, type, x, y: 20, width: 200, height: 48, label: "Call Us", href: "tel:", color: "#3f6b2f" };
    case "shape":
      return { id, type, x, y: 20, width: 280, height: 120, color: "#f4f4f5" };
    case "bookingWidget":
      return { id, type, x: 20, y: 20, width: Math.max(320, canvasWidth - 40), height: 700 };
    case "html":
      return { id, type, x, y: 20, width: 280, height: 160, html: "<p style=\"text-align:center;font-family:sans-serif\">Paste your own HTML here</p>" };
  }
}

// Defensive parse — a malformed or hand-edited blocksJson value should
// never crash the live embed; it just renders as an empty canvas (which,
// combined with `published` gating in book/page.tsx, is the same as if the
// business owner hadn't published anything yet).
export function parseBlocks(json: string): Block[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as Block[]) : [];
  } catch {
    return [];
  }
}

export function serializeBlocks(blocks: Block[]): string {
  return JSON.stringify(blocks);
}
