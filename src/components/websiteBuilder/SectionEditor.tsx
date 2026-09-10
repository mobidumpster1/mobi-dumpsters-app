"use client";

import { useState } from "react";
import { SectionPropForm } from "./SectionPropForm";
import { SECTION_REGISTRY, getSectionDefinition, createDefaultSection, type SectionInstance } from "@/lib/websiteSections";
import { saveSections } from "@/app/(internal)/website-builder/sectionActions";
import { togglePublished } from "@/app/(internal)/website-builder/actions";

export function SectionEditor({
  initialSections,
  initialPublished,
  previewUrl,
}: {
  initialSections: SectionInstance[];
  initialPublished: boolean;
  previewUrl: string;
}) {
  const [sections, setSections] = useState(initialSections);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [published, setPublished] = useState(initialPublished);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function addSection(type: SectionInstance["type"]) {
    const section = createDefaultSection(type);
    setSections((prev) => [...prev, section]);
    setExpandedId(section.id);
  }

  function updateSectionProp(id: string, key: string, value: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, props: { ...s.props, [key]: value } } : s))
    );
  }

  function deleteSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    setSections((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("sectionsJson", JSON.stringify(sections));
      await saveSections(formData);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublished() {
    const next = !published;
    setPublished(next);
    await togglePublished(next, "sections");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-zinc-900 bg-white p-3">
        {SECTION_REGISTRY.map((def) => (
          <button
            key={def.type}
            type="button"
            onClick={() => addSection(def.type)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            + {def.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {savedAt && !saving && <span className="text-xs text-zinc-400">Saved</span>}
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Preview
          </a>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={handleTogglePublished}
            className={`rounded-lg px-4 py-1.5 text-sm font-bold text-white ${published ? "bg-green-700 hover:bg-green-800" : "bg-zinc-400 hover:bg-zinc-500"}`}
          >
            {published ? "Published — customers see this" : "Not published"}
          </button>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-400">
          Add a section from the toolbar above to get started — they&apos;ll stack top to bottom, in order.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sections.map((section, index) => {
            const def = getSectionDefinition(section.type);
            const expanded = expandedId === section.id;
            return (
              <div key={section.id} className="rounded-lg border-2 border-zinc-900 bg-white">
                <div className="flex items-center gap-3 p-3">
                  <span className="text-lg">{def.icon}</span>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : section.id)}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-bold text-ink">{def.label}</p>
                    <p className="text-xs text-zinc-500">{def.description}</p>
                  </button>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveSection(index, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                      className="flex h-8 w-8 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(index, 1)}
                      disabled={index === sections.length - 1}
                      aria-label="Move down"
                      className="flex h-8 w-8 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSection(section.id)}
                      className="ml-1 text-xs font-semibold text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div className="border-t border-zinc-100 p-4">
                    <SectionPropForm
                      fields={def.fields}
                      values={section.props}
                      onChange={(key, value) => updateSectionProp(section.id, key, value)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
