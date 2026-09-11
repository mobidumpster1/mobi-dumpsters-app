"use client";

import { useEffect, useRef, useState } from "react";
import { CanvasRenderer } from "./CanvasRenderer";
import type { Block } from "@/lib/websiteBuilder";
import type { BookingFormProps } from "@/app/book/BookingForm";

// Live (non-editable) rendering of a freeCanvas section's blocks. Free-
// positioned blocks can't reflow without breaking, so instead of trying
// to make each block responsive, the whole band scales down as a single
// unit once its real container is narrower than the design width it was
// built at — same technique a design tool's "fit to screen" uses. The
// wrapper's own height is set to the *scaled* height so shrinking the
// band never leaves a gap below it.
export function FreeCanvasBand({
  blocks,
  designWidth,
  height,
  bookingFormProps,
}: {
  blocks: Block[];
  designWidth: number;
  height: number;
  bookingFormProps: BookingFormProps;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function update() {
      if (!el) return;
      setScale(Math.min(1, el.offsetWidth / designWidth));
    }
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [designWidth]);

  // Below design width, a block marked "hide on mobile" is dropped
  // entirely rather than shown scaled down to unreadable.
  const visibleBlocks = scale < 1 ? blocks.filter((b) => !b.hideOnMobile) : blocks;

  return (
    // Outer div stays full-width purely so containerRef measures the real
    // available space (that's what `scale` is computed from). Now that
    // sections can sit in a much wider page than this band's fixed
    // designWidth (full-bleed siblings no longer cap the whole page at
    // ~672px), the scaled content needs its own centered, exactly-sized
    // wrapper — otherwise it just left-aligns in a sea of empty space
    // instead of looking like a normal centered section.
    <div ref={containerRef} className="w-full overflow-hidden">
      <div className="mx-auto" style={{ width: designWidth * scale, height: height * scale }}>
        <div style={{ width: designWidth, height, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <CanvasRenderer
            blocks={visibleBlocks}
            canvasWidth={designWidth}
            canvasHeight={height}
            editable={false}
            bookingFormProps={bookingFormProps}
          />
        </div>
      </div>
    </div>
  );
}
