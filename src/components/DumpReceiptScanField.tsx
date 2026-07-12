"use client";

import { useRef, useState } from "react";
import { inputClass } from "@/components/Field";
import { scanDumpReceipt } from "@/app/(internal)/customers/dumpActions";

// Photographing a dump/landfill receipt pre-fills the Date/Weight/Fee
// fields in the surrounding manual-entry form (see the Dump Log tab on a
// customer's page) — the fields stay fully editable either way, so this
// is purely a shortcut, not a replacement for typing them in by hand.
// Must be rendered inside the <form> it's filling in, same requirement as
// ImageUploadField relying on closest("form").
export function DumpReceiptScanField() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptUrlRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedFilename, setScannedFilename] = useState<string | null>(null);

  function setFieldValue(form: HTMLFormElement, fieldName: string, value: string) {
    const field = form.elements.namedItem(fieldName);
    if (field instanceof HTMLInputElement) {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )!.set!;
      setter.call(field, value);
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const form = containerRef.current?.closest("form");
    if (!file || !form) return;
    setScanning(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await scanDumpReceipt(formData);
      setFieldValue(form, "date", result.date);
      setFieldValue(form, "weightTons", String(result.weightTons));
      setFieldValue(form, "fee", String(result.fee));
      if (receiptUrlRef.current) receiptUrlRef.current.value = result.receiptUrl;
      setScannedFilename(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that receipt");
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-1.5 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3"
    >
      <input type="hidden" name="receiptUrl" ref={receiptUrlRef} />
      <label className="text-xs font-medium text-zinc-600">
        Scan Receipt (optional) — fills in the fields below automatically
      </label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        disabled={scanning}
        className={inputClass}
      />
      {scanning && (
        <p className="text-xs text-amber-600">Reading the receipt…</p>
      )}
      {scannedFilename && !scanning && !error && (
        <p className="text-xs text-green-600">
          ✓ Filled in from {scannedFilename} — double check before saving.
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
