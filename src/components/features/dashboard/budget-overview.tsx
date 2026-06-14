import Link from "next/link";

import { STATUS_META } from "@/components/features/budgets/budget-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { formatMoney } from "@/lib/money";
import type { BudgetOverview } from "@/server/services/budget.service";

/** Dashboard widget: this month's most-consumed budgets + alert counts. */
export function BudgetOverviewWidget({
  data,
  currency,
  locale,
}: {
  data: BudgetOverview;
  currency: string;
  locale: string;
}) {
  const { summary, items } = data;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Budgets This Month</CardTitle>
        <Link
          href="/budgets"
          className="text-xs font-medium text-primary hover:underline"
        >
          Manage
        </Link>
      </CardHeader>
      <CardContent>
        {summary.count === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No budgets set.{" "}
            <Link href="/budgets" className="text-primary hover:underline">
              Create one
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {(summary.overCount > 0 || summary.warningCount > 0) && (
              <p className="text-sm">
                {summary.overCount > 0 && (
                  <span className="font-medium text-danger">
                    {summary.overCount} over budget
                  </span>
                )}
                {summary.overCount > 0 && summary.warningCount > 0 && " · "}
                {summary.warningCount > 0 && (
                  <span className="font-medium text-warning">
                    {summary.warningCount} nearing limit
                  </span>
                )}
              </p>
            )}

            <ul className="flex flex-col gap-3">
              {items.map((b) => (
                <li key={b.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: b.categoryColor }}
                        aria-hidden
                      />
                      <span className="truncate">{b.categoryName}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatMoney(b.spent, currency, locale)} /{" "}
                      {formatMoney(b.amount, currency, locale)}
                    </span>
                  </div>
                  <ProgressBar
                    percent={b.percent}
                    barClassName={STATUS_META[b.status].bar}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
