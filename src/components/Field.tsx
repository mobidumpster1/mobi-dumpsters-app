import { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-700">
        {label}
      </label>
      {children}
    </div>
  );
}

// bg-white and text-ink are set explicitly (not just inherited) because a
// <select> with no background falls back to the OS/browser's native form
// control theme — on Windows with a dark browser/system theme, that renders
// as a dark box behind our dark text, making the chosen option unreadable
// even though the page itself is forced light via .theme-light.
export const inputClass =
  "rounded-xl border border-zinc-300 bg-white px-5 py-4 text-base text-ink transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
