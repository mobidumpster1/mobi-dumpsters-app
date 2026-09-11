"use client";

import { useEffect, useRef, useState } from "react";
import { SectionPropForm } from "./SectionPropForm";
import { FreeCanvasSectionEditor } from "./FreeCanvasSectionEditor";
import {
  SECTION_REGISTRY,
  FREE_CANVAS_META,
  getSectionDefinition,
  createDefaultSection,
  createFreeCanvasSection,
  isFreeCanvasSection,
  serializeSections,
  parseSections,
  type SectionInstance,
  type NormalSectionType,
} from "@/lib/websiteSections";
import { saveSections, togglePublished, restoreVersion } from "@/app/(internal)/website-builder/sectionActions";

const AUTOSAVE_DEBOUNCE_MS = 2000;

type VersionSummary = { id: string; label: string; createdAt: Date };

export function SectionEditor({
  initialSections,
  initialPublished,
  initialVersions,
  canUseHtml,
  previewUrl,
}: {
  initialSections: SectionInstance[];
  initialPublished: boolean;
  initialVersions: VersionSummary[];
  canUseHtml: boolean;
  previewUrl: string;
}) {
  const [sections, setSections] = useState(initialSections);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [published, setPublished] = useState(initialPublished);
  const [versions, setVersions] = useState(initialVersions);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Debounced autosave — 2s after the last change, save quietly. The
  // explicit Save button below calls the exact same function immediately,
  // for when someone wants the "Saved" confirmation right now rather than
  // waiting. Skips the very first render (nothing's changed yet).
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void handleSave();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections]);

  function addSection(type: NormalSectionType) {
    const section = createDefaultSection(type);
    setSections((prev) => [...prev, section]);
    setExpandedId(section.id);
  }

  function addFreeCanvas() {
    const section = createFreeCanvasSection();
    setSections((prev) => [...prev, section]);
    setExpandedId(section.id);
  }

  function updateSectionProp(id: string, key: string, value: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === id && !isFreeCanvasSection(s) ? { ...s, props: { ...s.props, [key]: value } } : s))
    );
  }

  function updateFreeCanvasProps(id: string, props: Extract<SectionInstance, { type: "freeCanvas" }>["props"]) {
    setSections((prev) => prev.map((s) => (s.id === id && isFreeCanvasSection(s) ? { ...s, props } : s)));
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
      formData.set("sectionsJson", serializeSections(sections));
      await saveSections(formData);
      setSavedAt(Date.now());
      setVersions((prev) => [{ id: "pending", label: "Autosave", createdAt: new Date() }, ...prev].slice(0, 10));
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublished() {
    const next = !published;
    setPublished(next);
    await togglePublished(next);
  }

  async function handleRestore(versionId: string) {
    if (!window.confirm("Load this saved version? Your current unsaved changes will be replaced (what's here now is saved first, so it's recoverable too).")) {
      return;
    }
    const result = await restoreVersion(versionId);
    setSections(parseSections(result.sectionsJson));
    setExpandedId(null);
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
        <button
          type="button"
          onClick={addFreeCanvas}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          + {FREE_CANVAS_META.label}
        </button>
        <div className="ml-auto flex items-center gap-2">
          {savedAt && !saving && <span className="text-xs text-zinc-400">Saved</span>}
          {saving && <span className="text-xs text-zinc-400">Saving…</span>}
          <button
            type="button"
            onClick={() => setVersionsOpen((v) => !v)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Saved Versions
          </button>
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

      {versionsOpen && (
        <div className="rounded-lg border border-zinc-200 bg-white p-3">
          <p className="mb-2 text-xs font-semibold text-zinc-500">
            The last {versions.length} saves — restoring loads one back as your draft (doesn&apos;t publish it, and doesn&apos;t discard anything).
          </p>
          {versions.length === 0 ? (
            <p className="text-sm text-zinc-400">Nothing saved yet.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-zinc-50">
                  <span className="text-zinc-700">
                    {v.label} <span className="text-zinc-400">· {new Date(v.createdAt).toLocaleString()}</span>
                  </span>
                  {v.id !== "pending" && (
                    <button
                      type="button"
                      onClick={() => handleRestore(v.id)}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      Restore
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {sections.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-400">
          Add a section from the toolbar above to get started — they&apos;ll stack top to bottom, in order.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sections.map((section, index) => {
            const isCanvas = isFreeCanvasSection(section);
            const def = isCanvas ? FREE_CANVAS_META : getSectionDefinition(section.type as NormalSectionType);
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
                    {isFreeCanvasSection(section) ? (
                      <FreeCanvasSectionEditor
                        section={section}
                        onChange={(props) => updateFreeCanvasProps(section.id, props)}
                        canUseHtml={canUseHtml}
                      />
                    ) : (
                      <SectionPropForm
                        fields={getSectionDefinition(section.type).fields}
                        values={section.props}
                        onChange={(key, value) => updateSectionProp(section.id, key, value)}
                      />
                    )}
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
