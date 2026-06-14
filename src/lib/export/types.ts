/** Generic tabular dataset shared by all export encoders. */

export type ExportFormat = "csv" | "xlsx" | "pdf";

export type ColumnType = "text" | "number" | "money";

export interface ExportColumn {
  key: string;
  label: string;
  type: ColumnType;
}

export interface ExportDataset {
  /** File/sheet title. */
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  /** Money cells hold MINOR units (cents); encoders convert for display. */
  rows: Array<Record<string, string | number>>;
  currency: string;
  locale: string;
}

export const CONTENT_TYPE: Record<ExportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

export const FILE_EXTENSION: Record<ExportFormat, string> = {
  csv: "csv",
  xlsx: "xlsx",
  pdf: "pdf",
};
