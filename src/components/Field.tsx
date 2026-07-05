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

export const inputClass =
  "rounded-xl border border-zinc-300 px-5 py-4 text-base transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
