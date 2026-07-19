"use client";

export function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden rounded-lg border-2 border-zinc-900 px-4 py-2 text-sm font-bold text-zinc-900 transition-colors hover:bg-zinc-50"
    >
      Print / Save PDF
    </button>
  );
}
