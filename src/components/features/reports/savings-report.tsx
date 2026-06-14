"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney, formatMoneyCompact, toMajor } from "@/lib/money";
import type { SavingsReport as SavingsReportData } from "@/server/services/reports.service";

import {
  ACCENT_COLOR,
  AXIS_TICK,
  GRID_STROKE,
  PRIMARY_COLOR,
  TOOLTIP_STYLE,
} from "./chart-theme";
import { ReportShell, ReportTable } from "./report-shell";

export function SavingsReport({
  report,
  currency,
  locale,
}: {
  report: SavingsReportData;
  currency: string;
  locale: string;
}) {
  const csvRows = report.rows.map((r) => ({
    Month: r.label,
    Savings: toMajor(r.savings).toFixed(2),
    Cumulative: toMajor(r.cumulative).toFixed(2),
    "Savings %": r.savingsRate,
  }));

  return (
    <ReportShell title="Savings" csvName="savings-report.csv" csvRows={csvRows}>
      <div className="flex flex-wrap gap-6 text-sm">
        <span>
          Total saved in range:{" "}
          <span
            className={`font-semibold ${report.totalSavings < 0 ? "text-danger" : "text-success"}`}
          >
            {formatMoney(report.totalSavings, currency, locale)}
          </span>
        </span>
        <span>
          Avg savings rate:{" "}
          <span className="font-semibold">{report.avgSavingsRate}%</span>
        </span>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={report.rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
            <Bar dataKey="savings" name="Monthly savings" fill={PRIMARY_COLOR} radius={[4, 4, 0, 0]} />
            <Line
              type="monotone"
              dataKey="cumulative"
              name="Cumulative"
              stroke={ACCENT_COLOR}
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ReportTable headers={["Month", "Savings", "Cumulative", "Savings %"]}>
        {report.rows.map((r) => (
          <tr key={r.key}>
            <td className="px-3 py-2">{r.label}</td>
            <td
              className={`px-3 py-2 text-right tabular-nums ${r.savings < 0 ? "text-danger" : ""}`}
            >
              {formatMoney(r.savings, currency, locale)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">
              {formatMoney(r.cumulative, currency, locale)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">{r.savingsRate}%</td>
          </tr>
        ))}
      </ReportTable>
    </ReportShell>
  );
}
