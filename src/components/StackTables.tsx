"use client";

import { useEffect, useRef } from "react";

// On a phone, a wide table scrolls sideways and hides most of its columns.
// This turns each table inside it into a stack of small cards (one per row,
// each value labeled with its column heading), using the table's own header
// text. On wider screens nothing changes. The stacking itself is CSS
// (.stack-table in globals.css); this only labels the cells, and re-labels
// when the content changes (switching tabs).
export function StackTables({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    function label() {
      if (!root) return;
      root.querySelectorAll("table").forEach((table) => {
        const headers = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent?.trim() ?? "");
        if (headers.length < 2) return;
        table.classList.add("stack-table");
        table.querySelectorAll("tbody tr, tfoot tr").forEach((row) => {
          let column = 0;
          row.querySelectorAll(":scope > td").forEach((cell) => {
            const span = Number(cell.getAttribute("colspan") ?? "1");
            if (span === 1 && headers[column] && cell.getAttribute("data-label") !== headers[column]) {
              cell.setAttribute("data-label", headers[column]);
            }
            column += span;
          });
        });
      });
    }

    label();
    const observer = new MutationObserver(label);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{children}</div>;
}
