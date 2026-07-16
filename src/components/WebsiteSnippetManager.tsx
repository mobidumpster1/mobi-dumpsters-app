"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/Field";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CopyTextButton } from "@/components/CopyTextButton";

type Snippet = { id: string; name: string; html: string };

function SnippetCard({
  snippet,
  saveAction,
  deleteAction,
}: {
  snippet: Snippet;
  saveAction: (formData: FormData) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-200">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-left font-medium text-ink"
        >
          {snippet.name}
        </button>
        <div className="flex items-center gap-3">
          <CopyTextButton
            text={snippet.html}
            label="Copy Code"
            className="text-sm font-semibold text-brand hover:underline"
          />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-sm text-zinc-400"
          >
            {open ? "Hide" : "Edit"}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-zinc-200 p-4">
          <form action={saveAction} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={snippet.id} />
            <Field label="Name" htmlFor={`name-${snippet.id}`}>
              <input
                id={`name-${snippet.id}`}
                name="name"
                defaultValue={snippet.name}
                required
                className={inputClass}
              />
            </Field>
            <Field label="HTML" htmlFor={`html-${snippet.id}`}>
              <textarea
                id={`html-${snippet.id}`}
                name="html"
                rows={10}
                defaultValue={snippet.html}
                required
                className={`${inputClass} font-mono text-base sm:text-sm`}
              />
            </Field>
            <div>
              <button
                type="submit"
                className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
              >
                Save
              </button>
            </div>
          </form>
          <form action={deleteAction.bind(null, snippet.id)} className="mt-3">
            <ConfirmButton
              message={`Delete "${snippet.name}"? This can't be undone.`}
              className="text-sm text-red-600 hover:underline"
            >
              Delete
            </ConfirmButton>
          </form>
        </div>
      )}
    </div>
  );
}

// A saved library of custom HTML blocks a business owner writes or pastes
// (e.g. a hand-tweaked embed, a promo banner) for reuse on their own
// website — separate from the always-current auto-generated widgets, which
// aren't stored anywhere since they'd just go stale.
export function WebsiteSnippetManager({
  snippets,
  saveAction,
  deleteAction,
}: {
  snippets: Snippet[];
  saveAction: (formData: FormData) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="mt-4 flex flex-col gap-2">
      {snippets.map((snippet) => (
        <SnippetCard
          key={snippet.id}
          snippet={snippet}
          saveAction={saveAction}
          deleteAction={deleteAction}
        />
      ))}
      {snippets.length === 0 && !adding && (
        <p className="text-sm text-zinc-400">No saved snippets yet.</p>
      )}

      {adding ? (
        <div className="rounded-xl border border-zinc-200 p-4">
          <form
            action={async (formData) => {
              await saveAction(formData);
              setAdding(false);
            }}
            className="flex flex-col gap-3"
          >
            <Field label="Name" htmlFor="new-snippet-name">
              <input
                id="new-snippet-name"
                name="name"
                required
                placeholder="e.g. Homepage Banner"
                className={inputClass}
              />
            </Field>
            <Field label="HTML" htmlFor="new-snippet-html">
              <textarea
                id="new-snippet-html"
                name="html"
                rows={8}
                required
                className={`${inputClass} font-mono text-base sm:text-sm`}
              />
            </Field>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
              >
                Save Snippet
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="text-sm text-zinc-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="self-start rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          + Add Snippet
        </button>
      )}
    </div>
  );
}
