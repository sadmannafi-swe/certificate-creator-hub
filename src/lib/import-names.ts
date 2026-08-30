export interface SheetData {
  headers: string[];
  rows: string[][];
}

/** Parses a CSV/XLSX/XLS file into a header row plus data rows. */
export async function readSheet(file: File): Promise<SheetData> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const first = wb.SheetNames[0];
  if (!first) return { headers: [], rows: [] };
  const sheet = wb.Sheets[first]!;
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
  const cleaned = matrix
    .map((row) => (row ?? []).map((cell) => (cell == null ? "" : String(cell).trim())))
    .filter((row) => row.some((cell) => cell !== ""));

  if (!cleaned.length) return { headers: [], rows: [] };

  const width = Math.max(...cleaned.map((r) => r.length));
  const pad = (r: string[]) => Array.from({ length: width }, (_, i) => r[i] ?? "");

  const firstRow = pad(cleaned[0]!);
  const looksLikeHeader = firstRow.some((c) =>
    /^(name|full name|participant|participants|student|attendee|recipient)$/i.test(c),
  );

  if (looksLikeHeader) {
    return { headers: firstRow, rows: cleaned.slice(1).map(pad) };
  }
  return {
    headers: firstRow.map((_, i) => `Column ${i + 1}`),
    rows: cleaned.map(pad),
  };
}

/** Picks the most likely name column index. */
export function guessNameColumn(headers: string[], rows: string[][]): number {
  const idx = headers.findIndex((h) =>
    /name|participant|student|attendee|recipient/i.test(h),
  );
  if (idx >= 0) return idx;
  // fall back to the first column that isn't purely numeric
  const width = headers.length;
  for (let c = 0; c < width; c++) {
    const values = rows.map((r) => r[c] ?? "").filter(Boolean);
    if (values.length && !values.every((v) => /^\d+([.)])?$/.test(v))) return c;
  }
  return 0;
}
