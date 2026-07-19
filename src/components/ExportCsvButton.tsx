"use client";

// Builds the CSV entirely client-side (no server round trip needed for
// data already on the page) and triggers a download via a throwaway
// object URL — the same "no new dependency" approach as everything else
// in this app that doesn't strictly need a library.
function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (value: string | number) => {
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers, ...rows].map((row) => row.map(escape).join(","));
  return lines.join("\n");
}

export function ExportCsvButton({
  filename,
  headers,
  rows,
  className,
}: {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
  className?: string;
}) {
  function handleClick() {
    const csv = toCsv(headers, rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={rows.length === 0}
      className={
        className ??
        "print:hidden rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-40"
      }
    >
      Export CSV
    </button>
  );
}
