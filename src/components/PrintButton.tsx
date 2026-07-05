"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
    >
      Print / Save as PDF
    </button>
  );
}
