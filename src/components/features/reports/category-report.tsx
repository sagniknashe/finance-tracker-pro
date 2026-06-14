"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney, formatMoneyCompact, toMajor } from "@/lib/money";
import type { CategoryReport as CategoryReportData } from "@/server/services/reports.service";

import { AXIS_TICK, TOOLTIP_STYLE } from "./chart-theme";
import { ReportShell, ReportTable } from "./report-shell";

export function CategoryReport({
  report,
  currency,
  locale,
}: {
  report: CategoryReportData;
  currency: string;
  locale: string;
}) {
  // Chart shows the top expense categories (the most actionable view).
  const expenseRows = report.rows
    .filter((r) => r.type === "EXPENSE")
    .slice(0, 10);

  const csvRows = report.rows.map((r) => ({
    Category: r.name,
    Type: r.type,
    Total: toMajor(r.total).toFixed(2),
    "Share %": r.percent,
    Transactions: r.count,
  }));

  return (
    <ReportShell
      title="Category Report"
      csvName="category-report.csv"
      csvRows={csvRows}
    >
      {expenseRows.length > 0 && (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={expenseRows}
              layout="vertical"
              margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
            >
              <XAxis
                type="number"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatMoneyCompact(v, currency, locale)}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={TOOLTIP_STYLE}
                formatter={(value) => [
                  formatMoney(Number(value), currency, locale),
                  "Total",
                ]}
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {expenseRows.map((r) => (
                  <Cell key={r.categoryId ?? r.name} fill={r.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <ReportTable headers={["Category", "Type", "Total", "Share", "Count"]}>
        {report.rows.map((r) => (
          <tr key={`${r.type}-${r.categoryId ?? r.name}`}>
            <td className="px-3 py-2">
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: r.color }}
                  aria-hidden
                />
                {r.name}
              </span>
            </td>
            <td className="px-3 py-2 text-right text-muted-foreground">
              {r.type === "INCOME" ? "Income" : "Expense"}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">
              {formatMoney(r.total, currency, locale)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">{r.percent}%</td>
            <td className="px-3 py-2 text-right tabular-nums">{r.count}</td>
          </tr>
        ))}
      </ReportTable>

      {report.rows.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No transactions in this range.
        </p>
      )}
    </ReportShell>
  );
}
