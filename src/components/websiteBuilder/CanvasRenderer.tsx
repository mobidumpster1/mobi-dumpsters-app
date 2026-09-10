"use client";

import { Rnd } from "react-rnd";
import type { Block } from "@/lib/websiteBuilder";
import { BookingForm, type BookingFormProps } from "@/app/book/BookingForm";

// Shown in the editor only (never the live embed) so it's always obvious
// what each box is without having to click it first — addresses "hard to
// tell what's happening" on the canvas.
const BLOCK_LABELS: Record<Block["type"], { icon: string; label: string }> = {
  text: { icon: "T", label: "Text" },
  image: { icon: "🖼", label: "Image" },
  button: { icon: "▭", label: "Button" },
  shape: { icon: "◻", label: "Shape" },
  bookingWidget: { icon: "📋", label: "Booking Widget" },
};

const DRAG_GRID: [number, number] = [10, 10];

// Renders one block's actual content — shared between the editor (where
// it's wrapped in a draggable/resizable <Rnd>) and the live embed (where
// it's just a plain absolutely-positioned box) so the two can never
// visually drift apart; there's exactly one place that knows what a
// "text block" or "button block" looks like.
function BlockContent({
  block,
  editable,
  bookingFormProps,
}: {
  block: Block;
  editable: boolean;
  bookingFormProps?: BookingFormProps;
}) {
  switch (block.type) {
    case "text":
      return (
        <div
          style={{
            fontSize: block.fontSize,
            color: block.color,
            fontWeight: block.bold ? 700 : 400,
            textAlign: block.align,
          }}
          className="h-full w-full overflow-hidden whitespace-pre-wrap"
        >
          {block.content}
        </div>
      );
    case "image":
      return block.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={block.url} alt={block.alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center border-2 border-dashed border-zinc-300 bg-zinc-50 text-xs text-zinc-400">
          No image yet
        </div>
      );
    case "button": {
      const className =
        "flex h-full w-full items-center justify-center rounded-lg px-4 text-center text-sm font-bold text-white";
      const style = { backgroundColor: block.color };
      return editable ? (
        <div className={className} style={style}>
          {block.label}
        </div>
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
  onChange?: (id: string, patch: Partial<Pick<Block, "x" | "y" | "width" | "height">>) => void;
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
            <BlockContent block={block} editable />
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
