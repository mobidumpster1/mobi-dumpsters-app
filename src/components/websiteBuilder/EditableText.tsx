"use client";

import { useEffect, useRef, useState } from "react";

type Tag = "div" | "span" | "p" | "h1" | "h2";

// Shared by SectionRenderer's Hero/CtaBanner and CanvasRenderer's text/
// button blocks — the one place that knows how to turn a plain string prop
// into a click-to-type element, so neither renderer forks an "editing"
// version of itself; they just pass `editable` through, same as
// CanvasRenderer already does for the rest of a block's rendering.
//
// Deliberately uncontrolled once mounted: the initial value seeds React's
// children exactly once (avoiding the classic contentEditable-vs-React
// diffing fight), and external changes (e.g. an undo/redo restoring an
// older value) are applied imperatively via the ref, only while the field
// isn't focused, so they never clobber an in-progress edit.
export function EditableText({
  value,
  onCommit,
  editable,
  placeholder,
  as = "div",
  className,
  style,
  multiline = false,
}: {
  value: string;
  onCommit: (next: string) => void;
  editable: boolean;
  placeholder: string;
  as?: Tag;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const beforeRef = useRef(value);
  const editingRef = useRef(false);
  const [initialValue] = useState(value);
  // JSX supports a dynamic tag via a capitalized variable bound to a tag
  // name string — renders the real <h1>/<p>/<div>/etc, not a wrapper.
  const Tag = as;

  useEffect(() => {
    if (ref.current && !editingRef.current && ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
  }, [value]);

  if (!editable) {
    return (
      <Tag className={className} style={style}>
        {value || <span className="opacity-0">{placeholder}</span>}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref as React.Ref<never>}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      className={`${className ?? ""} ${multiline ? "whitespace-pre-wrap" : ""} cursor-text rounded-sm outline-none empty:before:pointer-events-none empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400 focus:ring-2 focus:ring-brand/40`}
      style={style}
      onFocus={() => {
        editingRef.current = true;
        beforeRef.current = value;
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        editingRef.current = false;
        const next = e.currentTarget.textContent ?? "";
        if (next !== beforeRef.current) onCommit(next);
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === "Escape") {
          e.currentTarget.blur();
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (multiline) {
            document.execCommand("insertText", false, "\n");
          } else {
            e.currentTarget.blur();
          }
        }
      }}
      onPaste={(e: React.ClipboardEvent<HTMLElement>) => {
        e.preventDefault();
        document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
      }}
    >
      {initialValue}
    </Tag>
  );
}
