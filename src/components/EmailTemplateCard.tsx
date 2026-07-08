"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/Field";
import { ConfirmButton } from "@/components/ConfirmButton";

export function EmailTemplateCard({
  templateKey,
  label,
  description,
  placeholders,
  subject,
  body,
  isCustomized,
  saveAction,
  resetAction,
}: {
  templateKey: string;
  label: string;
  description: string;
  placeholders: string[];
  subject: string;
  body: string;
  isCustomized: boolean;
  saveAction: (formData: FormData) => Promise<void>;
  resetAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span>
          <span className="font-medium text-ink">{label}</span>
          {isCustomized && (
            <span className="ml-2 rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand">
              Customized
            </span>
          )}
        </span>
        <span className="text-sm text-zinc-400">{open ? "Hide" : "Edit"}</span>
      </button>

      {open && (
        <div className="border-t border-zinc-200 p-4">
          <p className="text-sm text-zinc-500">{description}</p>
          <p className="mt-2 text-xs text-zinc-400">
            Available placeholders: {placeholders.map((p) => `{{${p}}}`).join(", ")}
          </p>

          <form action={saveAction} className="mt-3 flex flex-col gap-3">
            <Field label="Subject" htmlFor={`subject-${templateKey}`}>
              <input
                id={`subject-${templateKey}`}
                name="subject"
                defaultValue={subject}
                className={inputClass}
              />
            </Field>
            <Field label="Body" htmlFor={`body-${templateKey}`}>
              <textarea
                id={`body-${templateKey}`}
                name="body"
                rows={8}
                defaultValue={body}
                className={`${inputClass} font-mono text-sm`}
              />
            </Field>
            <button
              type="submit"
              className="self-start rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Save
            </button>
          </form>
          {isCustomized && (
            <form action={resetAction} className="mt-3">
              <ConfirmButton
                message="Reset this email back to the default wording?"
                className="text-sm text-red-600 hover:underline"
              >
                Reset to default
              </ConfirmButton>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
