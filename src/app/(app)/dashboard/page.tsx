import type { Metadata } from "next";

import { BudgetOverviewWidget } from "@/components/features/dashboard/budget-overview";
import { CategoryDistributionChart } from "@/components/features/dashboard/category-distribution-chart";
import { RecentTransactions } from "@/components/features/dashboard/recent-transactions";
import { StatCards } from "@/components/features/dashboard/stat-cards";
import { TrendAreaChart } from "@/components/features/dashboard/trend-area-chart";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/guards";
import { getDashboardData } from "@/server/services/dashboard.service";

export const metadata: Metadata = { title: "Dashboard · Finance Tracker Pro" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sessionUser = await requireUser();

  // Read everything in parallel: dashboard aggregates + display preferences.
  const [data, user] = await Promise.all([
    getDashboardData(sessionUser.id),
    db.user.findUnique({
      where: { id: sessionUser.id },
      select: { baseCurrency: true, locale: true },
    }),
  ]);

  const currency = user?.baseCurrency ?? "USD";
  const locale = user?.locale ?? "en-US";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your financial overview at a glance.
        </p>
      </div>

      <StatCards summary={data.summary} currency={currency} locale={locale} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TrendAreaChart
          title="Income Trend"
          data={data.trends}
          dataKey="income"
          color="#16A34A"
          currency={currency}
          locale={locale}
        />
        <TrendAreaChart
          title="Expense Trend"
          data={data.trends}
          dataKey="expense"
          color="#DC2626"
          currency={currency}
          locale={locale}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CategoryDistributionChart
          data={data.distribution}
          currency={currency}
          locale={locale}
        />
        <BudgetOverviewWidget
          data={data.budgets}
          currency={currency}
          locale={locale}
        />
      </div>

      <RecentTransactions
        recent={data.recent}
        currency={currency}
        locale={locale}
      />
    </div>
  );
}
