"use client";

import { useState } from "react";

// Copies an arbitrary block of text (embed code, snippet HTML) to the
// clipboard — same pattern as CopyLinkButton, but for text that isn't a
// same-origin path.
export function CopyTextButton({
  text,
  label,
  className,
}: {
  text: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copy this:", text);
        }
      }}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
