"use client";

import { useState } from "react";
import { QrScanner } from "./QrScanner";

export function ScanButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "rounded-lg border-2 border-zinc-900 bg-white px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-zinc-50"
        }
      >
        Scan QR
      </button>
      {open && <QrScanner onClose={() => setOpen(false)} />}
    </>
  );
}
