"use client";

import { upload } from "@vercel/blob/client";
import { useState } from "react";
import type { SectionPropField } from "@/lib/websiteSections";
import { Field, inputClass } from "@/components/Field";

// Generic, schema-driven form — one field descriptor drives one input,
// same idea as FieldDefinition/CustomFieldInputs.tsx for equipment/
// customer/booking custom fields, adapted to section content types.
export function SectionPropForm({
  fields,
  values,
  onChange,
}: {
  fields: SectionPropField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  async function handleImageFile(key: string, file: File) {
    setUploadingKey(key);
    try {
      const blob = await upload(`website-builder/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
      });
      onChange(key, blob.url);
    } finally {
      setUploadingKey(null);
    }
  }

  if (fields.length === 0) {
    return <p className="text-xs text-zinc-500">Nothing to configure — this section fills itself in automatically.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {fields.map((field) => (
        <Field key={field.key} label={field.label} htmlFor={`section-${field.key}`}>
          {field.type === "longtext" ? (
            <textarea
              id={`section-${field.key}`}
              rows={2}
              value={values[field.key] ?? ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              className={inputClass}
            />
          ) : field.type === "image" ? (
            <div className="flex items-center gap-3">
              {values[field.key] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={values[field.key]}
                  alt=""
                  className="h-14 w-14 flex-shrink-0 rounded-lg border border-zinc-200 object-cover"
                />
              )}
              <div className="flex flex-col gap-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageFile(field.key, file);
                  }}
                  className={inputClass}
                />
                {uploadingKey === field.key && <p className="text-xs text-amber-600">Uploading…</p>}
              </div>
            </div>
          ) : (
            <input
              id={`section-${field.key}`}
              type="text"
              placeholder={field.placeholder}
              value={values[field.key] ?? ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
      ))}
    </div>
  );
}
