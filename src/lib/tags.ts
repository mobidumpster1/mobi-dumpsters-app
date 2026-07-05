export function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function normalizeTagsInput(raw: string): string {
  return parseTags(raw).join(", ");
}
