"use client";

import { useEffect, useRef, useState } from "react";
import { SectionList } from "./SectionRenderer";
import { SectionPropForm } from "./SectionPropForm";
import { FreeCanvasSectionEditor } from "./FreeCanvasSectionEditor";
import { EditableSectionShell } from "./EditableSectionShell";
import { InsertSectionGap } from "./InsertSectionGap";
import { BrandPanel } from "./BrandPanel";
import { useCommandHistory, type Command } from "./useCommandHistory";
import { useBurstCommand } from "./useBurstCommand";
import { useSectionDragReorder } from "./useSectionDragReorder";
import {
  SECTION_REGISTRY,
  FREE_CANVAS_META,
  getSectionDefinition,
  createDefaultSection,
  createFreeCanvasSection,
  isFreeCanvasSection,
  insertSectionAt,
  duplicateSection,
  reorderSections,
  parsePageData,
  serializePageData,
  type SectionInstance,
  type FreeCanvasSectionInstance,
  type NormalSectionInstance,
  type NormalSectionType,
  type PageData,
} from "@/lib/websiteSections";
import { themeToCssVars, type PageTheme } from "@/lib/websiteBuilderTheme";
import { FONT_VARIABLES_CLASS } from "@/lib/websiteBuilderFonts";
import { saveSections, togglePublished, restoreVersion } from "@/app/(internal)/website-builder/sectionActions";
import type { CategoryOption } from "@/app/book/categoryPricing";
import type { BookingFormProps } from "@/app/book/BookingForm";

const AUTOSAVE_DEBOUNCE_MS = 2000;

type VersionSummary = { id: string; label: string; createdAt: Date };

export function SectionEditor({
  initialSections,
  initialTheme,
  initialPublished,
  initialVersions,
  canUseHtml,
  previewUrl,
  categories,
  bookingFormProps,
}: {
  initialSections: SectionInstance[];
  initialTheme: PageTheme;
  initialPublished: boolean;
  initialVersions: VersionSummary[];
  canUseHtml: boolean;
  previewUrl: string;
  categories: CategoryOption[];
  bookingFormProps: BookingFormProps;
}) {
  const history = useCommandHistory<PageData>({ sections: initialSections, theme: initialTheme });
  const [published, setPublished] = useState(initialPublished);
  const [versions, setVersions] = useState(initialVersions);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [settingsOpenId, setSettingsOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const settingsBurst = useBurstCommand<{ sectionId: string; key: string; value: string }>();
  const freeCanvasBurst = useBurstCommand<{ sectionId: string; props: FreeCanvasSectionInstance["props"] }>();
  const themeBurst = useBurstCommand<PageTheme>();

  const { sections, theme } = history.state;
  const { undo, redo } = history;

  // Debounced autosave — 2s after the last change, save quietly. The
  // explicit Save button below calls the exact same function immediately.
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
  }, [history.state]);

  // Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z — skipped while focus is inside a text
  // field so the browser's own native undo handles in-progress typing
  // instead of fighting this stack (our text commands only commit on
  // blur/Escape, not per keystroke).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[contenteditable="true"], input, textarea, select')) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  function addSectionAt(index: number, type: NormalSectionType | "freeCanvas") {
    const section = type === "freeCanvas" ? createFreeCanvasSection() : createDefaultSection(type);
    history.run({
      apply: (s) => ({ ...s, sections: insertSectionAt(s.sections, index, section) }),
      invert: (s) => ({ ...s, sections: s.sections.filter((sec) => sec.id !== section.id) }),
    });
  }

  function handleDuplicate(index: number) {
    const original = sections[index];
    const clone = duplicateSection(original);
    history.run({
      apply: (s) => ({ ...s, sections: insertSectionAt(s.sections, index + 1, clone) }),
      invert: (s) => ({ ...s, sections: s.sections.filter((sec) => sec.id !== clone.id) }),
    });
  }

  function handleDelete(index: number) {
    const removed = sections[index];
    history.run({
      apply: (s) => ({ ...s, sections: s.sections.filter((sec) => sec.id !== removed.id) }),
      invert: (s) => ({ ...s, sections: insertSectionAt(s.sections, index, removed) }),
    });
    if (settingsOpenId === removed.id) setSettingsOpenId(null);
  }

  // Arrow buttons and drag-to-reorder both call this exact function, so
  // the two paths can never disagree about the resulting order.
  function handleReorder(fromIndex: number, toIndex: number) {
    history.run({
      apply: (s) => ({ ...s, sections: reorderSections(s.sections, fromIndex, toIndex) }),
      invert: (s) => ({ ...s, sections: reorderSections(s.sections, toIndex, fromIndex) }),
    });
  }

  const drag = useSectionDragReorder(
    sections.map((s) => s.id),
    handleReorder
  );

  // Inline text/image commits from SectionList (EditableText/EditableImage
  // already coalesce to one call per edit via their own blur/upload
  // commit, so this pushes a command directly, no extra bursting needed).
  function handleFieldChange(sectionId: string, key: string, value: string) {
    const section = sections.find((s) => s.id === sectionId);
    if (!section || isFreeCanvasSection(section)) return;
    const oldValue = section.props[key] ?? "";
    if (oldValue === value) return;
    const command: Command<PageData> = {
      apply: (s) => ({
        ...s,
        sections: s.sections.map((sec) => (sec.id === sectionId && !isFreeCanvasSection(sec) ? { ...sec, props: { ...sec.props, [key]: value } } : sec)),
      }),
      invert: (s) => ({
        ...s,
        sections: s.sections.map((sec) => (sec.id === sectionId && !isFreeCanvasSection(sec) ? { ...sec, props: { ...sec.props, [key]: oldValue } } : sec)),
      }),
    };
    history.run(command);
  }

  // The Settings popover's link/URL field is a plain per-keystroke
  // controlled input, so its edits are burst-coalesced the same way a
  // color picker is — one undo step per typing session, not per key.
  function handleSettingsFieldChange(sectionId: string, key: string, value: string) {
    const section = sections.find((s) => s.id === sectionId);
    if (!section || isFreeCanvasSection(section)) return;
    const before = { sectionId, key, value: section.props[key] ?? "" };
    const after = { sectionId, key, value };
    history.setLive((s) => ({
      ...s,
      sections: s.sections.map((sec) => (sec.id === sectionId && !isFreeCanvasSection(sec) ? { ...sec, props: { ...sec.props, [key]: value } } : sec)),
    }));
    settingsBurst.report(before, after, (b, a) => {
      history.pushCommand({
        apply: (s) => ({
          ...s,
          sections: s.sections.map((sec) => (sec.id === a.sectionId && !isFreeCanvasSection(sec) ? { ...sec, props: { ...sec.props, [a.key]: a.value } } : sec)),
        }),
        invert: (s) => ({
          ...s,
          sections: s.sections.map((sec) => (sec.id === b.sectionId && !isFreeCanvasSection(sec) ? { ...sec, props: { ...sec.props, [b.key]: b.value } } : sec)),
        }),
      });
    });
  }

  // A Free Layout section's blocks change constantly while dragging/
  // resizing/typing in BlockInspector — coalesced the same way.
  function handleFreeCanvasChange(sectionId: string, newProps: FreeCanvasSectionInstance["props"]) {
    const section = sections.find((s) => s.id === sectionId);
    if (!section || !isFreeCanvasSection(section)) return;
    const before = { sectionId, props: section.props };
    const after = { sectionId, props: newProps };
    history.setLive((s) => ({
      ...s,
      sections: s.sections.map((sec) => (sec.id === sectionId && isFreeCanvasSection(sec) ? { ...sec, props: newProps } : sec)),
    }));
    freeCanvasBurst.report(before, after, (b, a) => {
      history.pushCommand({
        apply: (s) => ({
          ...s,
          sections: s.sections.map((sec) => (sec.id === a.sectionId && isFreeCanvasSection(sec) ? { ...sec, props: a.props } : sec)),
        }),
        invert: (s) => ({
          ...s,
          sections: s.sections.map((sec) => (sec.id === b.sectionId && isFreeCanvasSection(sec) ? { ...sec, props: b.props } : sec)),
        }),
      });
    });
  }

  // Picking a Free Layout starter template is a single deliberate click,
  // not a burst — applies immediately as its own undo step.
  function handleApplyTheme(next: PageTheme) {
    const before = theme;
    history.run({ apply: (s) => ({ ...s, theme: next }), invert: (s) => ({ ...s, theme: before }) });
  }

  function handleThemeChange(next: PageTheme) {
    const before = theme;
    history.setLive((s) => ({ ...s, theme: next }));
    themeBurst.report(before, next, (b, a) => {
      history.pushCommand({ apply: (s) => ({ ...s, theme: a }), invert: (s) => ({ ...s, theme: b }) });
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("sectionsJson", serializePageData(sections, theme));
      await saveSections(formData);
      const now = Date.now();
      setSavedAt(now);
      // A placeholder row for the save that just happened — the real id
      // only exists once the next full page load refetches versions from
      // the server, so each one needs its own unique key (not a shared
      // literal "pending", which produced duplicate-key React warnings
      // once more than one autosave fired in a session).
      setVersions((prev) => [{ id: `pending-${now}`, label: "Autosave", createdAt: new Date(now) }, ...prev.filter((v) => !v.id.startsWith("pending-"))].slice(0, 10));
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
    history.reset(parsePageData(result.sectionsJson, theme.brandColor));
    setVersionsOpen(false);
  }

  return (
    <div className={FONT_VARIABLES_CLASS} style={themeToCssVars(theme)}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-zinc-900 bg-white p-3">
          {SECTION_REGISTRY.map((def) => (
            <button
              key={def.type}
              type="button"
              onClick={() => addSectionAt(sections.length, def.type)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              + {def.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => addSectionAt(sections.length, "freeCanvas")}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            + {FREE_CANVAS_META.label}
          </button>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={history.undo}
              disabled={!history.canUndo}
              aria-label="Undo"
              title="Undo"
              className="flex h-8 w-8 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
            >
              ↶
            </button>
            <button
              type="button"
              onClick={history.redo}
              disabled={!history.canRedo}
              aria-label="Redo"
              title="Redo"
              className="mr-2 flex h-8 w-8 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
            >
              ↷
            </button>
            {savedAt && !saving && <span className="text-xs text-zinc-400">Saved</span>}
            {saving && <span className="text-xs text-zinc-400">Saving…</span>}
            <button
              type="button"
              onClick={() => setBrandOpen((v) => !v)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Brand
            </button>
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

        {brandOpen && <BrandPanel theme={theme} onChange={handleThemeChange} onClose={() => setBrandOpen(false)} />}

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
                    {!v.id.startsWith("pending-") && (
                      <button type="button" onClick={() => handleRestore(v.id)} className="text-xs font-semibold text-brand hover:underline">
                        Restore
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-zinc-200 shadow-sm" style={{ backgroundColor: "var(--pt-surface)" }}>
          <div className="flex flex-col p-3">
            <InsertSectionGap onInsert={(type) => addSectionAt(0, type)} dropActive={drag.draggingId !== null && drag.dropIndex === 0} />
            {sections.length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-400">
                Add a section from the toolbar above to get started — they&apos;ll stack top to bottom, in order.
              </p>
            )}
            {sections.map((section, index) => {
              const isCanvas = isFreeCanvasSection(section);
              const def = isCanvas ? FREE_CANVAS_META : getSectionDefinition(section.type as NormalSectionType);
              const linkFields = isCanvas ? [] : getSectionDefinition(section.type as NormalSectionType).fields.filter((f) => f.type === "link");
              return (
                <div key={section.id}>
                  <EditableSectionShell
                    icon={def.icon}
                    label={def.label}
                    onMoveUp={() => handleReorder(index, index - 1)}
                    onMoveDown={() => handleReorder(index, index + 1)}
                    canMoveUp={index > 0}
                    canMoveDown={index < sections.length - 1}
                    onDuplicate={() => handleDuplicate(index)}
                    onDelete={() => handleDelete(index)}
                    onOpenSettings={linkFields.length > 0 ? () => setSettingsOpenId(section.id) : undefined}
                    hasSettings={linkFields.length > 0}
                    isDragging={drag.draggingId === section.id}
                    registerRef={(el) => drag.setItemRef(section.id, el)}
                    onPointerDown={(e) => drag.onPointerDown(e, section.id)}
                  >
                    {isCanvas ? (
                      <div className="p-3">
                        <FreeCanvasSectionEditor
                          section={section}
                          onChange={(props) => handleFreeCanvasChange(section.id, props)}
                          canUseHtml={canUseHtml}
                          onApplyTheme={handleApplyTheme}
                        />
                      </div>
                    ) : (
                      <SectionList
                        sections={[section]}
                        categories={categories}
                        bookingFormProps={bookingFormProps}
                        editable
                        onFieldChange={handleFieldChange}
                      />
                    )}
                  </EditableSectionShell>

                  {settingsOpenId === section.id && linkFields.length > 0 && (
                    <div className="mx-3 mt-1 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold text-zinc-500">Settings</p>
                        <button type="button" onClick={() => setSettingsOpenId(null)} className="text-xs text-zinc-400 hover:underline">
                          Done
                        </button>
                      </div>
                      <SectionPropForm
                        fields={linkFields}
                        values={(section as NormalSectionInstance).props}
                        onChange={(key, value) => handleSettingsFieldChange(section.id, key, value)}
                      />
                    </div>
                  )}

                  <InsertSectionGap
                    onInsert={(type) => addSectionAt(index + 1, type)}
                    dropActive={drag.draggingId !== null && drag.dropIndex === index + 1}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
