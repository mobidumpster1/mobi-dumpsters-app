// Describes one custom field an EquipmentCategory tracks (e.g. "Size (yd)"
// on a dumpster, or "Hour Meter" on an excavator). Stored as JSON on
// EquipmentCategory.fieldDefinitions and EquipmentItem.attributes so new
// equipment types can be added without changing the database schema.
export type FieldType = "text" | "number" | "date" | "boolean" | "select";

export type FieldDefinition = {
  key: string;
  label: string;
  type: FieldType;
  unit?: string;
  required?: boolean;
  options?: string[]; // for type "select"
};

export function parseFieldDefinitions(json: string): FieldDefinition[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseAttributes(json: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(json);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

// Reads attr_<key> fields from a submitted form (one per field the item's
// category defines) and converts each to the right JS type.
export function buildAttributesFromForm(
  formData: FormData,
  fieldDefs: FieldDefinition[]
): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};
  for (const field of fieldDefs) {
    const raw = formData.get(`attr_${field.key}`);
    if (field.type === "boolean") {
      attributes[field.key] = raw === "on" || raw === "true";
      continue;
    }
    if (typeof raw !== "string" || raw.trim() === "") continue;
    if (field.type === "number") {
      const num = Number(raw);
      if (!Number.isNaN(num)) attributes[field.key] = num;
    } else {
      attributes[field.key] = raw.trim();
    }
  }
  return attributes;
}

export function formatAttributeValue(
  field: FieldDefinition,
  value: unknown
): string {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "boolean") return value ? "Yes" : "No";
  if (field.unit) return `${value} ${field.unit}`;
  return String(value);
}
