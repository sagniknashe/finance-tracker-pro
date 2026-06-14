/**
 * Format encoders: turn an ExportDataset into a downloadable Buffer.
 * Server-only (uses xlsx + jspdf). Money cells are stored as minor units and
 * converted here per format (numeric for CSV/XLSX, formatted for PDF).
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { formatMoney, toMajor } from "@/lib/money";
import type { ExportColumn, ExportDataset } from "@/lib/export/types";

function numericValue(col: ExportColumn, raw: string | number): number | string {
  if (col.type === "money") return Number(toMajor(Number(raw)).toFixed(2));
  if (col.type === "number") return Number(raw);
  return String(raw ?? "");
}

// --- CSV (with BOM so Excel detects UTF-8) -----------------------------------
export function toCsvBuffer(ds: ExportDataset): Buffer {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [ds.columns.map((c) => escape(c.label)).join(",")];
  for (const row of ds.rows) {
    lines.push(
      ds.columns
        .map((c) => {
          const v = numericValue(c, row[c.key] ?? "");
          return escape(typeof v === "number" ? v.toFixed(c.type === "money" ? 2 : 0) : v);
        })
        .join(","),
    );
  }
  return Buffer.from(`﻿${lines.join("\n")}`, "utf8");
}

// --- XLSX --------------------------------------------------------------------
export function toXlsxBuffer(ds: ExportDataset): Buffer {
  const header = ds.columns.map((c) => c.label);
  const body = ds.rows.map((row) =>
    ds.columns.map((c) => numericValue(c, row[c.key] ?? "")),
  );
  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
  ws["!cols"] = ds.columns.map((c) => ({ wch: c.type === "text" ? 28 : 16 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, ds.title.slice(0, 31) || "Export");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// --- PDF ---------------------------------------------------------------------
export function toPdfBuffer(ds: ExportDataset): Buffer {
  const doc = new jsPDF({
    orientation: ds.columns.length > 5 ? "landscape" : "portrait",
  });

  doc.setFontSize(14);
  doc.text(ds.title, 14, 16);
  let startY = 22;
  if (ds.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(ds.subtitle, 14, 22);
    doc.setTextColor(0);
    startY = 28;
  }

  const head = [ds.columns.map((c) => c.label)];
  const body = ds.rows.map((row) =>
    ds.columns.map((c) => {
      const raw = row[c.key] ?? "";
      if (c.type === "money") return formatMoney(Number(raw), ds.currency, ds.locale);
      return String(raw);
    }),
  );

  autoTable(doc, {
    head,
    body,
    startY,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [99, 102, 241] },
    columnStyles: Object.fromEntries(
      ds.columns.map((c, i) => [
        i,
        { halign: c.type === "text" ? "left" : "right" },
      ]),
    ),
  });

  return Buffer.from(doc.output("arraybuffer"));
}

export function encode(
  ds: ExportDataset,
  format: "csv" | "xlsx" | "pdf",
): Buffer {
  if (format === "csv") return toCsvBuffer(ds);
  if (format === "xlsx") return toXlsxBuffer(ds);
  return toPdfBuffer(ds);
}
