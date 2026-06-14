/**
 * File parsing: CSV / XLSX / PDF → a uniform { columns, rows } grid.
 *
 * Runs server-side only (xlsx and pdf-parse are Node libraries). PDF parsing is
 * best-effort: bank PDFs have no real column structure, so we extract text and
 * use a date/amount line heuristic to recover [Date, Description, Amount].
 */
import * as XLSX from "xlsx";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

import {
  MAX_IMPORT_ROWS,
  type AmountMode,
  type ColumnMapping,
  type ImportFileType,
  type ParsedGrid,
} from "@/lib/import/types";

// --- CSV (RFC-4180-ish state machine, handles quotes & embedded newlines) ----
export function parseCsv(input: string): string[][] {
  let text = input;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // ignore; handled on \n
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully-empty lines.
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// --- XLSX --------------------------------------------------------------------
function parseXlsx(buffer: Buffer): string[][] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName]!;
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
  return aoa.map((r) => r.map((c) => (c == null ? "" : String(c))));
}

// --- PDF (heuristic) ---------------------------------------------------------
const DATE_RE = /(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/;
const AMOUNT_END_RE = /(-?\(?\s*[$€£₹]?\s*[\d,]+\.\d{2}\)?)\s*$/;

async function parsePdf(buffer: Buffer): Promise<string[][]> {
  const { text } = await pdfParse(buffer);
  const rows: string[][] = [["Date", "Description", "Amount"]];

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const dateMatch = trimmed.match(DATE_RE);
    const amountMatch = trimmed.match(AMOUNT_END_RE);
    if (!dateMatch || !amountMatch) continue;

    const date = dateMatch[0];
    const amount = amountMatch[1]!.trim();
    const description = trimmed
      .slice(dateMatch.index! + date.length, trimmed.length - amountMatch[0].length)
      .trim();
    rows.push([date, description, amount]);
  }
  return rows;
}

// --- Header detection + column auto-detection --------------------------------
const KW = {
  date: ["date", "txn date", "transaction date", "value date", "posting date", "posted"],
  description: ["description", "narration", "particulars", "details", "remarks", "payee", "memo", "transaction"],
  amount: ["amount", "amt", "value", "transaction amount"],
  debit: ["debit", "withdrawal", "withdrawl", "paid out", "dr", "money out", "outflow", "expense"],
  credit: ["credit", "deposit", "paid in", "cr", "money in", "inflow", "income"],
};

const ALL_HEADER_WORDS = [
  ...KW.date, ...KW.description, ...KW.amount, ...KW.debit, ...KW.credit, "balance",
];

/** Score a row by how many cells look like column headers. */
function headerScore(row: string[]): number {
  let score = 0;
  for (const cell of row) {
    const c = cell.toLowerCase().trim();
    if (c && ALL_HEADER_WORDS.some((w) => c === w || c.includes(w))) score++;
  }
  return score;
}

/**
 * Find the header row. Bank statements often have title/account-info rows above
 * the real header, which would otherwise shift every transaction. We scan the
 * first rows and pick the best-scoring one (needs ≥ 2 header-like cells).
 */
function findHeaderRowIndex(raw: string[][]): number {
  let bestIndex = 0;
  let bestScore = 0;
  const scanTo = Math.min(raw.length, 25);
  for (let i = 0; i < scanTo; i++) {
    const score = headerScore(raw[i]!);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestScore >= 2 ? bestIndex : 0;
}

function findColumn(lower: string[], keys: string[], fallback: number): number {
  const exact = lower.findIndex((c) => keys.includes(c));
  if (exact >= 0) return exact;
  const partial = lower.findIndex((c) => keys.some((k) => c.includes(k)));
  return partial >= 0 ? partial : fallback;
}

function detectMapping(columns: string[]): {
  mapping: ColumnMapping;
  mode: AmountMode;
} {
  const lower = columns.map((c) => c.toLowerCase().trim());
  const date = findColumn(lower, KW.date, 0);
  const description = findColumn(lower, KW.description, Math.min(1, columns.length - 1));

  const debit = findColumn(lower, KW.debit, -1);
  const credit = findColumn(lower, KW.credit, -1);
  const amount = findColumn(lower, KW.amount, Math.max(0, columns.length - 1));

  // If the statement has distinct debit AND credit columns, prefer SPLIT mode.
  if (debit >= 0 && credit >= 0 && debit !== credit) {
    return {
      mapping: { date, description, amount, debit, credit },
      mode: "SPLIT",
    };
  }
  return {
    mapping: { date, description, amount, debit: -1, credit: -1 },
    mode: "SINGLE",
  };
}

export function detectFileType(fileName: string): ImportFileType | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "csv" || ext === "txt") return "csv";
  if (ext === "xlsx" || ext === "xls") return "xlsx";
  if (ext === "pdf") return "pdf";
  return null;
}

/** Parse a file buffer into a normalized grid (header row + data rows). */
export async function parseFile(
  buffer: Buffer,
  fileName: string,
  fileType: ImportFileType,
): Promise<ParsedGrid> {
  let raw: string[][];
  if (fileType === "csv") raw = parseCsv(buffer.toString("utf8"));
  else if (fileType === "xlsx") raw = parseXlsx(buffer);
  else raw = await parsePdf(buffer);

  if (raw.length === 0) {
    return {
      fileName,
      fileType,
      columns: [],
      rows: [],
      rowCount: 0,
      headerRowIndex: 0,
      suggestedMapping: { date: 0, description: 1, amount: 2, debit: -1, credit: -1 },
      suggestedMode: "SINGLE",
    };
  }

  // Detect the real header row (skip any preamble), then treat everything below
  // it as data.
  const headerRowIndex = findHeaderRowIndex(raw);
  const columns = raw[headerRowIndex]!.map((c, i) => c.trim() || `Column ${i + 1}`);
  const width = columns.length;
  // Pad/truncate data rows to a rectangular shape and cap the count.
  const rows = raw
    .slice(headerRowIndex + 1, headerRowIndex + 1 + MAX_IMPORT_ROWS)
    .map((r) => {
      const padded = r.slice(0, width);
      while (padded.length < width) padded.push("");
      return padded;
    });

  const detected = detectMapping(columns);

  return {
    fileName,
    fileType,
    columns,
    rows,
    rowCount: rows.length,
    headerRowIndex,
    suggestedMapping: detected.mapping,
    suggestedMode: detected.mode,
  };
}
