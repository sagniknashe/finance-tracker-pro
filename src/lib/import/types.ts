/** Shared types for the statement-import pipeline. */

export type ImportFileType = "csv" | "xlsx" | "pdf";

/** How to read the Amount column's sign into income/expense (SINGLE mode). */
export type SignConvention = "NEGATIVE_EXPENSE" | "POSITIVE_EXPENSE";

/**
 * SINGLE = one signed Amount column. SPLIT = separate Debit (money out) and
 * Credit (money in) columns, as on most bank exports.
 */
export type AmountMode = "SINGLE" | "SPLIT";

/** Hint for ambiguous numeric dates. */
export type DateFormatHint = "AUTO" | "DMY" | "MDY" | "YMD";

export interface ColumnMapping {
  date: number;
  description: number;
  amount: number; // used in SINGLE mode
  debit: number; // used in SPLIT mode; -1 when unused
  credit: number; // used in SPLIT mode; -1 when unused
}

export interface ParsedGrid {
  fileName: string;
  fileType: ImportFileType;
  columns: string[];
  rows: string[][];
  rowCount: number;
  /** Index of the detected header row within the original file (informational). */
  headerRowIndex: number;
  suggestedMapping: ColumnMapping;
  suggestedMode: AmountMode;
}

/** One row after applying the mapping (pure, DB-agnostic). */
export interface NormalizedRow {
  index: number;
  dateISO: string | null;
  description: string;
  amountMinor: number | null;
  type: "INCOME" | "EXPENSE" | null;
  errors: string[];
}

export const MAX_IMPORT_ROWS = 5000;
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
