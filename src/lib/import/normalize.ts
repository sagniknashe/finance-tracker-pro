/**
 * Pure normalization: turn raw grid rows + a column mapping into typed,
 * validated rows. No DB / crypto here so it can be unit-tested in isolation and
 * reused by both the preview and commit steps.
 */
import {
  type AmountMode,
  type ColumnMapping,
  type DateFormatHint,
  type NormalizedRow,
  type SignConvention,
} from "@/lib/import/types";

function makeUTC(y: number, mo: number, d: number): Date | null {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === mo - 1 &&
    dt.getUTCDate() === d
  ) {
    return dt;
  }
  return null;
}

export function parseDate(raw: string, hint: DateFormatHint): Date | null {
  const s = raw.trim();
  if (!s) return null;

  // ISO: YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return makeUTC(+iso[1]!, +iso[2]!, +iso[3]!);

  // Numeric with separators: d/m/y, m/d/y, etc.
  const m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (m) {
    const a = +m[1]!;
    const b = +m[2]!;
    let y = +m[3]!;
    if (y < 100) y += 2000;

    let day: number;
    let month: number;
    if (hint === "MDY") {
      month = a;
      day = b;
    } else if (hint === "DMY" || hint === "YMD") {
      day = a;
      month = b;
    } else {
      // AUTO: prefer day-first, but disambiguate when one value is > 12.
      if (a > 12 && b <= 12) {
        day = a;
        month = b;
      } else if (b > 12 && a <= 12) {
        month = a;
        day = b;
      } else {
        day = a;
        month = b;
      }
    }
    return makeUTC(y, month, day);
  }

  // Fallback: let the engine try (e.g. "Jan 5, 2026").
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t);
}

/** Parse a money string to a signed MAJOR-unit number. Handles currency
 *  symbols, thousands separators, and parenthesized negatives. */
export function parseAmount(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.trimStart().startsWith("-")) negative = true;

  const cleaned = s.replace(/[^0-9.]/g, "");
  if (cleaned === "" || cleaned === ".") return null;
  const n = Number.parseFloat(cleaned);
  if (Number.isNaN(n)) return null;
  return negative ? -n : n;
}

function deriveType(
  signedMajor: number,
  convention: SignConvention,
): "INCOME" | "EXPENSE" {
  const isExpense =
    convention === "NEGATIVE_EXPENSE" ? signedMajor < 0 : signedMajor > 0;
  return isExpense ? "EXPENSE" : "INCOME";
}

export interface NormalizeOptions {
  mapping: ColumnMapping;
  mode: AmountMode;
  convention: SignConvention; // used in SINGLE mode
  dateHint: DateFormatHint;
}

/** Resolve amount + type for one row in SINGLE mode (one signed column). */
function resolveSingle(
  row: string[],
  mapping: ColumnMapping,
  convention: SignConvention,
): { amountMinor: number | null; type: "INCOME" | "EXPENSE" | null; error?: string } {
  const signedMajor = parseAmount(row[mapping.amount] ?? "");
  if (signedMajor === null) return { amountMinor: null, type: null, error: "Invalid or missing amount" };
  if (signedMajor === 0) return { amountMinor: null, type: null, error: "Amount is zero" };
  return {
    amountMinor: Math.round(Math.abs(signedMajor) * 100),
    type: deriveType(signedMajor, convention),
  };
}

/** Resolve amount + type for one row in SPLIT mode (debit/credit columns). */
function resolveSplit(
  row: string[],
  mapping: ColumnMapping,
): { amountMinor: number | null; type: "INCOME" | "EXPENSE" | null; error?: string } {
  const debit = mapping.debit >= 0 ? parseAmount(row[mapping.debit] ?? "") : null;
  const credit = mapping.credit >= 0 ? parseAmount(row[mapping.credit] ?? "") : null;

  // A populated debit is money out (expense); a populated credit is money in.
  if (debit !== null && debit !== 0) {
    return { amountMinor: Math.round(Math.abs(debit) * 100), type: "EXPENSE" };
  }
  if (credit !== null && credit !== 0) {
    return { amountMinor: Math.round(Math.abs(credit) * 100), type: "INCOME" };
  }
  return { amountMinor: null, type: null, error: "No debit or credit amount" };
}

export function normalizeRows(
  rows: string[][],
  opts: NormalizeOptions,
): NormalizedRow[] {
  const { mapping, mode, convention, dateHint } = opts;

  return rows.map((row, index) => {
    const errors: string[] = [];

    const date = parseDate(row[mapping.date] ?? "", dateHint);
    if (!date) errors.push("Invalid or missing date");

    const description = (row[mapping.description] ?? "").trim();

    const resolved =
      mode === "SPLIT"
        ? resolveSplit(row, mapping)
        : resolveSingle(row, mapping, convention);
    if (resolved.error) errors.push(resolved.error);

    return {
      index,
      dateISO: date ? date.toISOString() : null,
      description,
      amountMinor: resolved.amountMinor,
      type: resolved.type,
      errors,
    };
  });
}
