"use client";

import { CheckCircle2, FileUp, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils/cn";
import type {
  AmountMode,
  ColumnMapping,
  DateFormatHint,
  ParsedGrid,
  SignConvention,
} from "@/lib/import/types";
import type {
  ImportPreviewResult,
  PreviewRow,
} from "@/server/services/import.service";
import type { AccountOption } from "@/types/reference";

type Step = "upload" | "map" | "preview" | "done";

function formatDate(iso: string | null, locale: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

const STATUS_BADGE: Record<PreviewRow["status"], string> = {
  VALID: "bg-success/10 text-success",
  INVALID: "bg-danger/10 text-danger",
  DUPLICATE: "bg-warning/10 text-warning",
};

export function ImportWizard({
  accounts,
  locale,
}: {
  accounts: AccountOption[];
  locale: string;
}) {
  const router = useRouter();

  const [step, setStep] = React.useState<Step>("upload");
  const [accountId, setAccountId] = React.useState(accounts[0]?.id ?? "");
  const [file, setFile] = React.useState<File | null>(null);
  const [grid, setGrid] = React.useState<ParsedGrid | null>(null);
  const [mapping, setMapping] = React.useState<ColumnMapping>({
    date: 0,
    description: 1,
    amount: 2,
    debit: -1,
    credit: -1,
  });
  const [amountMode, setAmountMode] = React.useState<AmountMode>("SINGLE");
  const [signConvention, setSignConvention] =
    React.useState<SignConvention>("NEGATIVE_EXPENSE");
  const [dateFormat, setDateFormat] = React.useState<DateFormatHint>("AUTO");
  const [preview, setPreview] = React.useState<ImportPreviewResult | null>(null);
  const [excluded, setExcluded] = React.useState<Set<number>>(new Set());
  const [result, setResult] = React.useState<{
    importedCount: number;
    skippedCount: number;
    total: number;
  } | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const currency =
    accounts.find((a) => a.id === accountId)?.currency ?? "USD";

  function reset() {
    setStep("upload");
    setFile(null);
    setGrid(null);
    setPreview(null);
    setExcluded(new Set());
    setResult(null);
    setError(null);
  }

  async function onUpload() {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    if (!accountId) {
      setError("Select an account.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import/parse", {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not parse the file");
        return;
      }
      const g = json.data as ParsedGrid;
      setGrid(g);
      setMapping(g.suggestedMapping);
      setAmountMode(g.suggestedMode);
      setStep("map");
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onPreview() {
    if (!grid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          rows: grid.rows,
          mapping,
          amountMode,
          signConvention,
          dateFormat,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not build preview");
        return;
      }
      setPreview(json as ImportPreviewResult);
      setExcluded(new Set());
      setStep("preview");
    } catch {
      setError("Preview failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onCommit() {
    if (!grid || !file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          fileName: file.name,
          fileType: grid.fileType,
          rows: grid.rows,
          mapping,
          amountMode,
          signConvention,
          dateFormat,
          excluded: [...excluded],
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? "Import failed");
        return;
      }
      setResult(json.data);
      setStep("done");
      router.refresh(); // refresh server-rendered import history
    } catch {
      setError("Import failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleRow(index: number) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const includedCount = preview
    ? preview.rows.filter((r) => r.status === "VALID" && !excluded.has(r.index))
        .length
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-foreground">
          Import bank statement
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Step{" "}
          {step === "upload" ? 1 : step === "map" ? 2 : step === "preview" ? 3 : 4}{" "}
          of 4
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}

        {/* STEP 1 — Upload */}
        {step === "upload" && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="import-account">Import into account</Label>
              <Select
                id="import-account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {accounts.length === 0 && <option value="">No accounts</option>}
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center hover:bg-muted/50">
              <FileUp className="h-8 w-8 text-muted-foreground" aria-hidden />
              <span className="text-sm font-medium">
                {file ? file.name : "Choose a CSV, XLSX or PDF file"}
              </span>
              <span className="text-xs text-muted-foreground">
                Up to 10 MB · {file ? "Click to replace" : "Click to browse"}
              </span>
              <input
                type="file"
                accept=".csv,.txt,.xlsx,.xls,.pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <div className="flex justify-end">
              <Button onClick={onUpload} isLoading={loading} disabled={!file}>
                <Upload className="h-4 w-4" aria-hidden />
                Upload & parse
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2 — Map columns */}
        {step === "map" && grid && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Detected {grid.rowCount} rows. Map the columns below.
            </p>

            {/* Date + Description always mapped */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(["date", "description"] as const).map((field) => (
                <div key={field} className="grid gap-2">
                  <Label htmlFor={`map-${field}`} className="capitalize">
                    {field}
                  </Label>
                  <Select
                    id={`map-${field}`}
                    value={mapping[field]}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [field]: Number(e.target.value) }))
                    }
                  >
                    {grid.columns.map((col, i) => (
                      <option key={i} value={i}>
                        {col}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>

            {/* Amount: single signed column vs separate debit/credit columns */}
            <div className="grid gap-2">
              <Label>How are amounts stored?</Label>
              <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
                {(
                  [
                    ["SINGLE", "One amount column"],
                    ["SPLIT", "Separate debit & credit"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAmountMode(mode)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      amountMode === mode
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {amountMode === "SINGLE" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="map-amount">Amount column</Label>
                  <Select
                    id="map-amount"
                    value={mapping.amount}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, amount: Number(e.target.value) }))
                    }
                  >
                    {grid.columns.map((col, i) => (
                      <option key={i} value={i}>
                        {col}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sign">Amount sign</Label>
                  <Select
                    id="sign"
                    value={signConvention}
                    onChange={(e) =>
                      setSignConvention(e.target.value as SignConvention)
                    }
                  >
                    <option value="NEGATIVE_EXPENSE">
                      Negative amounts are expenses
                    </option>
                    <option value="POSITIVE_EXPENSE">
                      Positive amounts are expenses
                    </option>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="map-debit">Debit column (money out)</Label>
                  <Select
                    id="map-debit"
                    value={mapping.debit}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, debit: Number(e.target.value) }))
                    }
                  >
                    <option value={-1}>— none —</option>
                    {grid.columns.map((col, i) => (
                      <option key={i} value={i}>
                        {col}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="map-credit">Credit column (money in)</Label>
                  <Select
                    id="map-credit"
                    value={mapping.credit}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, credit: Number(e.target.value) }))
                    }
                  >
                    <option value={-1}>— none —</option>
                    {grid.columns.map((col, i) => (
                      <option key={i} value={i}>
                        {col}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="datefmt">Date format</Label>
                <Select
                  id="datefmt"
                  value={dateFormat}
                  onChange={(e) =>
                    setDateFormat(e.target.value as DateFormatHint)
                  }
                >
                  <option value="AUTO">Auto-detect</option>
                  <option value="DMY">DD/MM/YYYY</option>
                  <option value="MDY">MM/DD/YYYY</option>
                  <option value="YMD">YYYY-MM-DD</option>
                </Select>
              </div>
            </div>

            {/* Sample of the first rows */}
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    {grid.columns.map((c, i) => (
                      <th key={i} className="px-2 py-1.5 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {grid.rows.slice(0, 5).map((r, ri) => (
                    <tr key={ri}>
                      {r.map((cell, ci) => (
                        <td key={ci} className="px-2 py-1.5">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={reset}>
                Back
              </Button>
              <Button onClick={onPreview} isLoading={loading}>
                Preview
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3 — Preview */}
        {step === "preview" && preview && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                <span className="font-semibold text-success">
                  {preview.summary.valid}
                </span>{" "}
                ready
              </span>
              <span>
                <span className="font-semibold text-warning">
                  {preview.summary.duplicate}
                </span>{" "}
                duplicates
              </span>
              <span>
                <span className="font-semibold text-danger">
                  {preview.summary.invalid}
                </span>{" "}
                invalid
              </span>
            </div>

            <div className="max-h-[28rem] overflow-auto rounded-md border border-border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="sticky top-0 bg-card text-xs uppercase text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 font-medium">Include</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.rows.map((r) => {
                    const importable = r.status === "VALID";
                    return (
                      <tr
                        key={r.index}
                        className={cn(!importable && "text-muted-foreground")}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            disabled={!importable}
                            checked={importable && !excluded.has(r.index)}
                            onChange={() => toggleRow(r.index)}
                            className="h-4 w-4 rounded border-input"
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {formatDate(r.dateISO, locale)}
                        </td>
                        <td className="max-w-[18rem] truncate px-3 py-2">
                          {r.description || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                          {r.amountMinor != null && r.type ? (
                            <span
                              className={
                                r.type === "INCOME"
                                  ? "text-success"
                                  : "text-danger"
                              }
                            >
                              {r.type === "INCOME" ? "+" : "−"}
                              {formatMoney(r.amountMinor, currency, locale)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {r.categoryName ? (
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: r.categoryColor ?? "#9CA3AF" }}
                                aria-hidden
                              />
                              {r.categoryName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              STATUS_BADGE[r.status],
                            )}
                            title={r.errors.join(", ")}
                          >
                            {r.status === "VALID"
                              ? "Ready"
                              : r.status === "DUPLICATE"
                                ? "Duplicate"
                                : "Invalid"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("map")}>
                Back
              </Button>
              <Button
                onClick={onCommit}
                isLoading={loading}
                disabled={includedCount === 0}
              >
                Import {includedCount} transaction{includedCount === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4 — Done */}
        {step === "done" && result && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-success" aria-hidden />
            <p className="text-lg font-semibold">Import complete</p>
            <p className="text-sm text-muted-foreground">
              Imported {result.importedCount} of {result.total} rows
              {result.skippedCount > 0
                ? ` · ${result.skippedCount} skipped`
                : ""}
              .
            </p>
            <Button onClick={reset}>Import another file</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
