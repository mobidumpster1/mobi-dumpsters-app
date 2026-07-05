"use client";

import { useState } from "react";
import type { FieldDefinition, FieldType } from "@/lib/categoryFields";
import { inputClass } from "@/components/Field";

const FIELD_TYPES: FieldType[] = ["text", "number", "date", "boolean", "select"];

export function CategoryFieldBuilder({
  initialFields = [],
}: {
  initialFields?: FieldDefinition[];
}) {
  const [fields, setFields] = useState<FieldDefinition[]>(initialFields);

  function updateField(index: number, patch: Partial<FieldDefinition>) {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f))
    );
  }

  function addField() {
    setFields((prev) => [...prev, { key: "", label: "", type: "text" }]);
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-700">
          Custom Fields for This Category
        </h3>
        <button
          type="button"
          onClick={addField}
          className="text-sm font-semibold text-brand hover:underline"
        >
          + Add Field
        </button>
      </div>
      {fields.length === 0 && (
        <p className="text-sm text-zinc-400">
          No custom fields yet. Add fields like &quot;Size (yd)&quot; or
          &quot;Hour Meter&quot; specific to this equipment type.
        </p>
      )}
      {fields.map((field, index) => (
        <div
          key={index}
          className="grid grid-cols-12 gap-2 rounded-xl border border-zinc-200 p-3"
        >
          <input
            className={`${inputClass} col-span-3`}
            placeholder="Key (e.g. sizeYards)"
            value={field.key}
            onChange={(e) => updateField(index, { key: e.target.value })}
          />
          <input
            className={`${inputClass} col-span-3`}
            placeholder="Label (e.g. Size)"
            value={field.label}
            onChange={(e) => updateField(index, { label: e.target.value })}
          />
          <select
            className={`${inputClass} col-span-2`}
            value={field.type}
            onChange={(e) =>
              updateField(index, { type: e.target.value as FieldType })
            }
          >
            {FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            className={`${inputClass} col-span-2`}
            placeholder="Unit (optional)"
            value={field.unit ?? ""}
            onChange={(e) => updateField(index, { unit: e.target.value })}
          />
          <label className="col-span-1 flex items-center gap-1 text-xs text-zinc-600">
            <input
              type="checkbox"
              checked={field.required ?? false}
              onChange={(e) =>
                updateField(index, { required: e.target.checked })
              }
            />
            Req
          </label>
          <button
            type="button"
            onClick={() => removeField(index)}
            className="col-span-1 text-sm text-red-600 hover:underline"
          >
            Remove
          </button>
          {field.type === "select" && (
            <input
              className={`${inputClass} col-span-12`}
              placeholder="Options, comma separated (e.g. Excellent,Good,Fair)"
              value={(field.options ?? []).join(",")}
              onChange={(e) =>
                updateField(index, {
                  options: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          )}
        </div>
      ))}
      <input
        type="hidden"
        name="fieldDefinitionsJson"
        value={JSON.stringify(fields)}
      />
    </div>
  );
}
