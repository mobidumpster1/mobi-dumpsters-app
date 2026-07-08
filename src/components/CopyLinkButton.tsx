"use client";

import { useState } from "react";

// Copies an absolute link (built from the current origin at click time, so
// it works the same on localhost, the .vercel.app URL, or a future custom
// domain) to the clipboard — for links staff need to hand a customer
// directly (e.g. by text) rather than wait for an automated email.
export function CopyLinkButton({
  path,
  label,
  className,
}: {
  path: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        const url = `${window.location.origin}${path}`;
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard access can be denied (older browsers, permissions) —
          // fall back to showing the link so staff can copy it by hand.
          window.prompt("Copy this link:", url);
        }
      }}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
