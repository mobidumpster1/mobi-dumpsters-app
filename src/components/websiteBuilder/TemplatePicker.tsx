"use client";

import { WEBSITE_BUILDER_TEMPLATES, instantiateTemplate, type WebsiteBuilderTemplate } from "@/lib/websiteBuilderTemplates";
import type { Block } from "@/lib/websiteBuilder";

// A tiny scaled-down preview of a template's layout — a real rendering of
// its blocks (not a screenshot), so it stays accurate if the templates
// ever change. Purely decorative here (not interactive), just to help
// tell the three templates apart at a glance.
function TemplateThumbnail({ template }: { template: WebsiteBuilderTemplate }) {
  const scale = 220 / template.canvasWidth;
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white"
      style={{ width: 220, height: template.canvasHeight * scale }}
    >
      {template.blocks.map((block) => (
        <div
          key={block.id}
          className="absolute rounded-sm"
          style={{
            left: block.x * scale,
            top: block.y * scale,
            width: block.width * scale,
            height: block.height * scale,
            backgroundColor: blockPreviewColor(block),
          }}
        />
      ))}
    </div>
  );
}

function blockPreviewColor(block: Block): string {
  switch (block.type) {
    case "text":
      return "#d4d4d8";
    case "image":
      return "#e4e4e7";
    case "button":
      return block.color;
    case "shape":
      return block.color;
    case "bookingWidget":
      return "#eef2ea";
    case "html":
      return "#e0e7ff";
  }
}

export function TemplatePicker({ onChoose }: { onChoose: (blocks: Block[], canvasWidth: number, canvasHeight: number) => void }) {
  return (
    <div className="rounded-lg border-2 border-zinc-900 bg-white p-6">
      <h2 className="text-xl font-black text-ink">Start with a layout</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Pick a starting point — everything on it (text, colors, buttons) is yours to change afterward.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {WEBSITE_BUILDER_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onChoose(instantiateTemplate(template), template.canvasWidth, template.canvasHeight)}
            className="flex flex-col items-center gap-2 rounded-lg border-2 border-zinc-200 p-3 text-center transition-colors hover:border-brand"
          >
            <TemplateThumbnail template={template} />
            <span className="text-sm font-bold text-ink">{template.name}</span>
            <span className="text-xs text-zinc-500">{template.description}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChoose([], 640, 800)}
        className="mt-4 text-sm font-semibold text-brand hover:underline"
      >
        Start from scratch instead →
      </button>
    </div>
  );
}
