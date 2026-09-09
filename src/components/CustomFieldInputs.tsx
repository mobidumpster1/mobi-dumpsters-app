import { Field, inputClass } from "@/components/Field";
import type { FieldDefinition } from "@/lib/categoryFields";

// Renders attr_<key> inputs for an org's custom field schema (Customer or
// Booking — see Organization.customerFieldDefinitions/
// bookingFieldDefinitions) — same rendering logic EquipmentItemForm uses
// for its per-category fields, factored out so it isn't duplicated across
// every place that needs custom fields.
export function CustomFieldInputs({
  fieldDefs,
  values = {},
}: {
  fieldDefs: FieldDefinition[];
  values?: Record<string, unknown>;
}) {
  if (fieldDefs.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <h3 className="mb-3 text-sm font-medium text-zinc-700">Additional Details</h3>
      <div className="flex flex-col gap-3">
        {fieldDefs.map((field) => (
          <Field
            key={field.key}
            label={`${field.label}${field.unit ? ` (${field.unit})` : ""}`}
            htmlFor={`attr_${field.key}`}
          >
            {field.type === "boolean" ? (
              <input
                id={`attr_${field.key}`}
                name={`attr_${field.key}`}
                type="checkbox"
                defaultChecked={Boolean(values[field.key])}
                className="h-4 w-4"
              />
            ) : field.type === "select" ? (
              <select
                id={`attr_${field.key}`}
                name={`attr_${field.key}`}
                defaultValue={String(values[field.key] ?? "")}
                required={field.required}
                className={inputClass}
              >
                <option value="">Select…</option>
                {(field.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`attr_${field.key}`}
                name={`attr_${field.key}`}
                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                step={field.type === "number" ? "any" : undefined}
                required={field.required}
                defaultValue={String(values[field.key] ?? "")}
                className={inputClass}
              />
            )}
          </Field>
        ))}
      </div>
    </div>
  );
}
