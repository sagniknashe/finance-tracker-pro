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

import { ACCOUNT_TYPE_LABEL } from "@/lib/constants";
import { formatMoney, formatMoneyCompact, toMajor } from "@/lib/money";
import type { AccountReport as AccountReportData } from "@/server/services/reports.service";

import {
  AXIS_TICK,
  EXPENSE_COLOR,
  GRID_STROKE,
  INCOME_COLOR,
  TOOLTIP_STYLE,
} from "./chart-theme";
import { ReportShell, ReportTable } from "./report-shell";

export function AccountReport({
  report,
  currency,
  locale,
}: {
  report: AccountReportData;
  currency: string;
  locale: string;
}) {
  const csvRows = report.rows.map((r) => ({
    Account: r.name,
    Type: ACCOUNT_TYPE_LABEL[r.type],
    Income: toMajor(r.income).toFixed(2),
    Expense: toMajor(r.expense).toFixed(2),
    Net: toMajor(r.net).toFixed(2),
    Balance: toMajor(r.balance).toFixed(2),
  }));

  return (
    <ReportShell
      title="Account Report"
      csvName="account-report.csv"
      csvRows={csvRows}
    >
      {report.rows.length > 0 && (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report.rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis
                width={56}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => formatMoneyCompact(v, currency, locale)}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
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
      )}

      <ReportTable headers={["Account", "Type", "Income", "Expense", "Net", "Balance"]}>
        {report.rows.map((r) => (
          <tr key={r.accountId}>
            <td className="px-3 py-2">{r.name}</td>
            <td className="px-3 py-2 text-right text-muted-foreground">
              {ACCOUNT_TYPE_LABEL[r.type]}
            </td>
            <td className="px-3 py-2 text-right tabular-nums text-success">
              {formatMoney(r.income, currency, locale)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums text-danger">
              {formatMoney(r.expense, currency, locale)}
            </td>
            <td
              className={`px-3 py-2 text-right tabular-nums ${r.net < 0 ? "text-danger" : ""}`}
            >
              {formatMoney(r.net, currency, locale)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">
              {formatMoney(r.balance, currency, locale)}
            </td>
          </tr>
        ))}
      </ReportTable>

      {report.rows.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No accounts yet.
        </p>
      )}
    </ReportShell>
  );
}
