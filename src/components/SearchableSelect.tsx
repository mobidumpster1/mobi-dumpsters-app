"use client";

import { useEffect, useRef, useState } from "react";
import { inputClass } from "@/components/Field";

type Option = { id: string; label: string };

// A type-to-filter dropdown for fields with a long option list (e.g. "every
// rental type") where a plain <select> gets hard to scroll through. Submits
// through a hidden input, so it's a drop-in replacement for a native
// <select name="..."> wherever it's used.
export function SearchableSelect({
  id,
  name,
  options,
  value,
  onChange,
  placeholder = "Search…",
  required,
}: {
  id?: string;
  name: string;
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} required={required} />
      <input
        id={id}
        type="text"
        autoComplete="off"
        className={inputClass}
        placeholder={placeholder}
        value={open ? query : (selected?.label ?? "")}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-zinc-300 bg-white shadow-lg">
          {filtered.length === 0 && (
            <p className="px-4 py-2.5 text-sm text-zinc-400">No matches</p>
          )}
          {filtered.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChange(option.id);
                setOpen(false);
                setQuery("");
              }}
              className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-50 ${
                option.id === value ? "bg-brand-light font-semibold text-brand" : "text-zinc-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
