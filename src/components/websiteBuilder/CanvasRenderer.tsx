"use client";

import { Rnd } from "react-rnd";
import type { Block } from "@/lib/websiteBuilder";
import { BookingForm, type BookingFormProps } from "@/app/book/BookingForm";
import { EditableText } from "./EditableText";
import { EditableImage } from "./EditableImage";

// Shown in the editor only (never the live embed) so it's always obvious
// what each box is without having to click it first — addresses "hard to
// tell what's happening" on the canvas.
const BLOCK_LABELS: Record<Block["type"], { icon: string; label: string }> = {
  text: { icon: "T", label: "Text" },
  image: { icon: "🖼", label: "Image" },
  button: { icon: "▭", label: "Button" },
  shape: { icon: "◻", label: "Shape" },
  bookingWidget: { icon: "📋", label: "Booking Widget" },
  html: { icon: "</>", label: "HTML" },
};

const DRAG_GRID: [number, number] = [10, 10];

// Renders one block's actual content — shared between the editor (where
// it's wrapped in a draggable/resizable <Rnd>) and the live embed (where
// it's just a plain absolutely-positioned box) so the two can never
// visually drift apart; there's exactly one place that knows what a
// "text block" or "button block" looks like. Text/image/button content is
// directly click-to-edit (EditableText/EditableImage) when editable —
// everything else (font size, color, bold, align, href, hide-on-mobile)
// stays in BlockInspector's side panel.
function BlockContent({
  block,
  editable,
  onFieldChange,
  bookingFormProps,
}: {
  block: Block;
  editable: boolean;
  onFieldChange?: (patch: Partial<Block>) => void;
  bookingFormProps?: BookingFormProps;
}) {
  switch (block.type) {
    case "text":
      return (
        <EditableText
          as="div"
          value={block.content}
          editable={editable}
          multiline
          placeholder="Add text"
          onCommit={(v) => onFieldChange?.({ content: v })}
          className="h-full w-full overflow-hidden"
          style={{ fontSize: block.fontSize, color: block.color, fontWeight: block.bold ? 700 : 400, textAlign: block.align }}
        />
      );
    case "image":
      return (
        <EditableImage
          url={block.url}
          alt={block.alt}
          editable={editable}
          onChange={(url) => onFieldChange?.({ url } as Partial<Block>)}
          className="h-full w-full"
          emptyLabel="Click to add an image"
        />
      );
    case "button": {
      const className =
        "flex h-full w-full items-center justify-center rounded-lg px-4 text-center text-sm font-bold text-white";
      const style = { backgroundColor: block.color };
      return editable ? (
        <EditableText
          as="div"
          value={block.label}
          editable
          placeholder="Button text"
          onCommit={(v) => onFieldChange?.({ label: v })}
          className={className}
          style={style}
        />
      ) : (
        <a href={block.href} className={className} style={style}>
          {block.label}
        </a>
      );
    }
    case "shape":
      return <div className="h-full w-full rounded-lg" style={{ backgroundColor: block.color }} />;
    case "bookingWidget":
      return editable ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-brand/50 bg-brand/5 text-center">
          <span className="text-2xl">📋</span>
          <span className="text-sm font-semibold text-ink">Booking Widget</span>
          <span className="px-4 text-xs text-zinc-500">
            Customers will see the real booking form here
          </span>
        </div>
      ) : bookingFormProps ? (
        <div className="h-full w-full overflow-y-auto">
          <BookingForm {...bookingFormProps} />
        </div>
      ) : null;
    case "html":
      // Sandboxed so a pasted embed (scripts included, like a review
      // widget) can never reach the parent page's DOM/cookies. Not
      // pointer-interactive while editing — same reasoning as the
      // booking widget placeholder above, so dragging the block around
      // doesn't get swallowed by whatever's inside the iframe — but it's
      // still a real live preview of the actual HTML, not a placeholder.
      // Raw code stays edited in BlockInspector's textarea, not inline.
      return (
        <iframe
          title="Custom HTML"
          srcDoc={block.html}
          sandbox="allow-scripts allow-popups"
          className={`h-full w-full border-0 ${editable ? "pointer-events-none" : ""}`}
        />
      );
  }
}

export function CanvasRenderer({
  blocks,
  canvasWidth,
  canvasHeight,
  editable,
  selectedBlockId,
  onSelect,
  onChange,
  bookingFormProps,
}: {
  blocks: Block[];
  canvasWidth: number;
  canvasHeight: number;
  editable: boolean;
  selectedBlockId?: string | null;
  onSelect?: (id: string) => void;
  onChange?: (id: string, patch: Partial<Block>) => void;
  bookingFormProps?: BookingFormProps;
}) {
  return (
    <div
      className="relative overflow-hidden bg-white"
      style={
        editable
          ? {
              width: canvasWidth,
              height: canvasHeight,
              backgroundImage: "radial-gradient(circle, #d4d4d8 1px, transparent 1px)",
              backgroundSize: "10px 10px",
            }
          : { width: canvasWidth, height: canvasHeight }
      }
    >
      {blocks.map((block) =>
        editable ? (
          <Rnd
            key={block.id}
            bounds="parent"
            dragGrid={DRAG_GRID}
            resizeGrid={DRAG_GRID}
            // Clicking into editable text/image content types/uploads
            // instead of starting a drag — only grabbing empty space on
            // the block (or its label chip) moves it.
            cancel='[contenteditable="true"], input, button, a'
            size={{ width: block.width, height: block.height }}
            position={{ x: block.x, y: block.y }}
            onDragStop={(_e, d) => onChange?.(block.id, { x: d.x, y: d.y })}
            onResizeStop={(_e, _dir, ref, _delta, position) =>
              onChange?.(block.id, {
                width: parseInt(ref.style.width, 10),
                height: parseInt(ref.style.height, 10),
                x: position.x,
                y: position.y,
              })
            }
            onMouseDown={() => onSelect?.(block.id)}
            className={
              selectedBlockId === block.id
                ? "outline outline-2 outline-offset-1 outline-brand"
                : "outline outline-1 outline-offset-1 outline-transparent hover:outline-zinc-300"
            }
          >
            <span className="pointer-events-none absolute -top-2.5 left-1 flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-zinc-500 shadow-sm">
              <span>{BLOCK_LABELS[block.type].icon}</span>
              {BLOCK_LABELS[block.type].label}
            </span>
            <BlockContent block={block} editable onFieldChange={(patch) => onChange?.(block.id, patch)} />
          </Rnd>
        ) : (
          <div
            key={block.id}
            className="absolute"
            style={{ left: block.x, top: block.y, width: block.width, height: block.height }}
          >
            <BlockContent block={block} editable={false} bookingFormProps={bookingFormProps} />
          </div>
        )
      )}
    </div>
  );
}
