"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import type { TrendPoint } from "@/server/services/dashboard.service";

/**
 * Reusable single-series area chart for the monthly Income and Expense trends.
 * Rendered once per metric so the two trends are independent, sharing one
 * implementation. Axis/grid colors use CSS variables so they follow the theme.
 */
export function TrendAreaChart({
  title,
  data,
  dataKey,
  color,
  currency,
  locale,
}: {
  title: string;
  data: TrendPoint[];
  dataKey: "income" | "expense";
  color: string;
  currency: string;
  locale: string;
}) {
  const gradientId = `grad-${dataKey}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                width={56}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  formatMoneyCompact(v, currency, locale)
                }
              />
              <Tooltip
                cursor={{ stroke: "hsl(var(--border))" }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  color: "hsl(var(--card-foreground))",
                  fontSize: 12,
                }}
                formatter={(value) => [
                  formatMoney(Number(value), currency, locale),
                  title,
                ]}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
