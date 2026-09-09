// A small hand-rolled CSV parser (RFC4180-ish: quoted fields, embedded
// commas/quotes via "" escaping) — same "no new dependency unless
// strictly needed" convention as ExportCsvButton's hand-rolled writer.
// Doesn't support a quoted field spanning multiple physical lines; every
// real-world export this needs to read (Excel, Google Sheets, this app's
// own CSV export) doesn't produce those.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (char === "\r") {
      i++;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += char;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

// Case-insensitive header lookup — a column that isn't present returns
// undefined for every row rather than throwing, so a CSV missing an
// optional column (e.g. no "Notes") still imports everything else.
export function csvColumnReader(headerRow: string[], dataRow: string[]) {
  const headers = headerRow.map((h) => h.trim().toLowerCase());
  return (columnName: string): string | undefined => {
    const i = headers.indexOf(columnName.toLowerCase());
    if (i === -1) return undefined;
    const value = dataRow[i]?.trim();
    return value ? value : undefined;
  };
}
