"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney, formatMoneyCompact, toMajor } from "@/lib/money";
import type { MonthlySummaryReport as MonthlySummaryReportData } from "@/server/services/reports.service";

import {
  AXIS_TICK,
  EXPENSE_COLOR,
  GRID_STROKE,
  INCOME_COLOR,
  TOOLTIP_STYLE,
} from "./chart-theme";
import { ReportShell, ReportTable } from "./report-shell";

export function MonthlySummaryReport({
  report,
  currency,
  locale,
}: {
  report: MonthlySummaryReportData;
  currency: string;
  locale: string;
}) {
  const csvRows = report.rows.map((r) => ({
    Month: r.label,
    Income: toMajor(r.income).toFixed(2),
    Expense: toMajor(r.expense).toFixed(2),
    Net: toMajor(r.net).toFixed(2),
    "Savings %": r.savingsRate,
  }));

  return (
    <ReportShell
      title="Monthly Summary"
      csvName="monthly-summary.csv"
      csvRows={csvRows}
    >
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={report.rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis
              width={56}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatMoneyCompact(v, currency, locale)}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value, name) => [
                formatMoney(Number(value), currency, locale),
                String(name),
              ]}
            />
            <Legend />
            <Bar dataKey="income" name="Income" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Expense" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ReportTable headers={["Month", "Income", "Expense", "Net", "Savings %"]}>
        {report.rows.map((r) => (
          <tr key={r.key}>
            <td className="px-3 py-2">{r.label}</td>
            <td className="px-3 py-2 text-right tabular-nums text-success">
              {formatMoney(r.income, currency, locale)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums text-danger">
              {formatMoney(r.expense, currency, locale)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">
              {formatMoney(r.net, currency, locale)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">{r.savingsRate}%</td>
          </tr>
        ))}
      </ReportTable>

      <div className="flex flex-wrap gap-6 border-t border-border pt-3 text-sm">
        <span>
          Total income:{" "}
          <span className="font-medium text-success">
            {formatMoney(report.totals.income, currency, locale)}
          </span>
        </span>
        <span>
          Total expense:{" "}
          <span className="font-medium text-danger">
            {formatMoney(report.totals.expense, currency, locale)}
          </span>
        </span>
        <span>
          Net:{" "}
          <span className="font-medium">
            {formatMoney(report.totals.net, currency, locale)}
          </span>
        </span>
      </div>
    </ReportShell>
  );
}
