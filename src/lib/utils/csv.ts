/**
 * Minimal CSV export helper (client-side). Builds a CSV from an array of flat
 * objects (header row taken from the first object's keys) and triggers a
 * browser download. Values containing commas/quotes/newlines are escaped per
 * RFC 4180.
 */
export type CsvRow = Record<string, string | number>;

export function toCsv(rows: CsvRow[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (value: string | number) => {
    const s = String(value ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h] ?? "")).join(",")),
  ].join("\n");
}

export function downloadCsv(filename: string, rows: CsvRow[]): void {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
