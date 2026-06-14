"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import type { CategorySlice } from "@/server/services/dashboard.service";

/** Current-month expense breakdown by category (donut + legend). */
export function CategoryDistributionChart({
  data,
  currency,
  locale,
}: {
  data: CategorySlice[];
  currency: string;
  locale: string;
}) {
  const total = data.reduce((s, d) => s + d.total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No expenses recorded this month.
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="h-64 w-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="total"
                    nameKey="name"
                    innerRadius="55%"
                    outerRadius="85%"
                    paddingAngle={2}
                    stroke="hsl(var(--card))"
                  >
                    {data.map((slice) => (
                      <Cell
                        key={slice.categoryId ?? slice.name}
                        fill={slice.color}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                      color: "hsl(var(--card-foreground))",
                      fontSize: 12,
                    }}
                    formatter={(value, name) => [
                      formatMoney(Number(value), currency, locale),
                      String(name),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend with amounts and share. */}
            <ul className="grid w-full gap-2 sm:w-1/2">
              {data.map((slice) => {
                const pct = total > 0 ? (slice.total / total) * 100 : 0;
                return (
                  <li
                    key={slice.categoryId ?? slice.name}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-sm"
                        style={{ backgroundColor: slice.color }}
                        aria-hidden
                      />
                      <span className="truncate">{slice.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatMoney(slice.total, currency, locale)} ({pct.toFixed(0)}%)
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
