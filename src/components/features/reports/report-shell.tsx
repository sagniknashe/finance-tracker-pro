"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadCsv, type CsvRow } from "@/lib/utils/csv";

/** Wraps a report tab: title + Export CSV button + body (chart & table). */
export function ReportShell({
  title,
  csvName,
  csvRows,
  children,
}: {
  title: string;
  csvName: string;
  csvRows: CsvRow[];
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base text-foreground">{title}</CardTitle>
        <Button
          variant="outline"
          size="sm"
          disabled={csvRows.length === 0}
          onClick={() => downloadCsv(csvName, csvRows)}
        >
          <Download className="h-4 w-4" aria-hidden />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">{children}</CardContent>
    </Card>
  );
}

/** Shared table shell with consistent styling. */
export function ReportTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-border text-xs uppercase text-muted-foreground">
          <tr>
            {headers.map((h, i) => (
              <th
                key={h}
                className={`px-3 py-2 font-medium ${i === 0 ? "" : "text-right"}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}
