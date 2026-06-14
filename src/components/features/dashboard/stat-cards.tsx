import {
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/lib/money";
import type { DashboardSummary } from "@/server/services/dashboard.service";

interface StatCardProps {
  title: string;
  amount: number;
  currency: string;
  locale: string;
  icon: LucideIcon;
  accent?: "default" | "income" | "expense" | "savings";
}

const accentColor: Record<NonNullable<StatCardProps["accent"]>, string> = {
  default: "text-foreground",
  income: "text-success",
  expense: "text-danger",
  savings: "text-primary",
};

function StatCard({
  title,
  amount,
  currency,
  locale,
  icon: Icon,
  accent = "default",
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "text-2xl font-semibold tracking-tight tabular-nums",
            accentColor[accent],
          )}
        >
          {formatMoney(amount, currency, locale)}
        </p>
      </CardContent>
    </Card>
  );
}

/** The four headline metric cards. Responsive: 1 col on mobile → 2 → 4. */
export function StatCards({
  summary,
  currency,
  locale,
}: {
  summary: DashboardSummary;
  currency: string;
  locale: string;
}) {
  const common = { currency, locale };
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Current Balance"
        amount={summary.netWorth}
        icon={Wallet}
        {...common}
      />
      <StatCard
        title="Income This Month"
        amount={summary.income}
        icon={ArrowUpRight}
        accent="income"
        {...common}
      />
      <StatCard
        title="Expenses This Month"
        amount={summary.expense}
        icon={ArrowDownRight}
        accent="expense"
        {...common}
      />
      <StatCard
        title="Savings This Month"
        amount={summary.savings}
        icon={PiggyBank}
        accent="savings"
        {...common}
      />
    </div>
  );
}
