"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseTags } from "@/lib/tags";

export function LeadTagsField({
  leadId,
  currentTags,
  suggestions,
  action,
}: {
  leadId: string;
  currentTags: string;
  // Previously-used tags across all leads, plus the org's service areas —
  // offered as one-click adds so a location tag (or a repeat qualification
  // tag) doesn't need to be retyped from scratch every time.
  suggestions: string[];
  action: (leadId: string, formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>(() => parseTags(currentTags));
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  async function save(nextTags: string[]) {
    setTags(nextTags);
    const formData = new FormData();
    formData.set("tags", nextTags.join(", "));
    await action(leadId, formData);
    router.refresh();
  }

  function addTag(raw: string) {
    // Tags are stored comma-separated (see src/lib/tags.ts), so a comma
    // typed inside one tag would get split into two on save — strip it
    // rather than let that happen silently.
    const tag = raw.replace(/,/g, "").trim();
    if (!tag || tags.includes(tag)) return;
    save([...tags, tag]);
    setInput("");
    setOpen(false);
  }

  function removeTag(tag: string) {
    save(tags.filter((t) => t !== tag));
  }

  const remainingSuggestions = suggestions.filter((s) => !tags.includes(s));

  return (
    <div className="relative flex min-w-[160px] flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => removeTag(tag)}
            title="Remove tag"
            className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand hover:bg-brand/20"
          >
            {tag} ×
          </button>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTag(input);
          }
        }}
        placeholder="Add tag…"
        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-base text-zinc-700 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 sm:text-xs"
      />
      {open && remainingSuggestions.length > 0 && (
        <div className="absolute top-full left-0 z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
          {remainingSuggestions
            .filter((s) => s.toLowerCase().includes(input.toLowerCase()))
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addTag(s)}
                className="block w-full px-3 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-50"
              >
                {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
