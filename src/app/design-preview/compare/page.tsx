// TEMPORARY design-exploration mockup — see ../_shared.tsx for cleanup notes.
// Side-by-side viewer for comparing the two layout directions at once.

export const dynamic = "force-static";

export default function DesignPreviewComparePage() {
  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      <div className="grid flex-shrink-0 grid-cols-2 border-b border-zinc-800">
        <div className="border-r border-zinc-800 px-4 py-2 text-center text-sm font-semibold text-zinc-300">
          Dark / Glow — /design-preview
        </div>
        <div className="px-4 py-2 text-center text-sm font-semibold text-zinc-300">
          Field-Ops / Flat — /design-preview/v2
        </div>
      </div>
      <div className="grid flex-1 grid-cols-2">
        <iframe src="/design-preview" className="h-full w-full border-r border-zinc-800" title="Dark / Glow direction" />
        <iframe src="/design-preview/v2" className="h-full w-full" title="Field-Ops / Flat direction" />
      </div>
    </div>
  );
}
