/**
 * Dashboard read model.
 *
 * Aggregates everything the dashboard needs in one place. All BigInt sums are
 * converted to plain `number` (minor units) before returning, so the result is
 * safe to pass across the Server → Client component boundary (BigInt is not
 * serializable by React/Next) and small enough to fit JS safe integers for any
 * realistic balance.
 *
 * Notes on correctness:
 *  - Net worth ignores TRANSFER rows: a transfer moves money between the user's
 *    own accounts, so it nets to zero and does not change net worth.
 *  - Monthly income/expense count INCOME/EXPENSE only, by business date
 *    (occurred_on), across all accounts.
 */
import { db } from "@/lib/db";
import {
  addMonthsUTC,
  monthKey,
  monthLabel,
  startOfMonthUTC,
} from "@/lib/utils/dates";
import {
  getBudgetOverview,
  type BudgetOverview,
} from "@/server/services/budget.service";

const num = (v: bigint | number | null | undefined): number => Number(v ?? 0);

export interface DashboardSummary {
  netWorth: number;
  income: number;
  expense: number;
  savings: number;
}

export interface TrendPoint {
  key: string; // YYYY-MM
  label: string; // e.g. "Jan"
  income: number;
  expense: number;
}

export interface CategorySlice {
  categoryId: string | null;
  name: string;
  color: string;
  total: number;
}

export interface RecentTransaction {
  id: string;
  date: string; // ISO date
  description: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  accountName: string;
  categoryName: string | null;
  categoryColor: string | null;
}

export interface DashboardData {
  summary: DashboardSummary;
  trends: TrendPoint[];
  distribution: CategorySlice[];
  recent: RecentTransaction[];
  budgets: BudgetOverview;
}

/** Current net worth = Σ opening balances + Σ income − Σ expense, over
 *  non-archived accounts. */
async function getNetWorth(userId: string): Promise<number> {
  const activeAccount = { isArchived: false };

  const [opening, income, expense] = await Promise.all([
    db.account.aggregate({
      _sum: { openingBalance: true },
      where: { userId, isArchived: false },
    }),
    db.transaction.aggregate({
      _sum: { amount: true },
      where: { userId, type: "INCOME", account: activeAccount },
    }),
    db.transaction.aggregate({
      _sum: { amount: true },
      where: { userId, type: "EXPENSE", account: activeAccount },
    }),
  ]);

  return (
    num(opening._sum.openingBalance) +
    num(income._sum.amount) -
    num(expense._sum.amount)
  );
}

/** Income / expense / savings for the given month window. */
async function getMonthSummary(
  userId: string,
  monthStart: Date,
  nextMonthStart: Date,
): Promise<{ income: number; expense: number; savings: number }> {
  const grouped = await db.transaction.groupBy({
    by: ["type"],
    _sum: { amount: true },
    where: {
      userId,
      type: { in: ["INCOME", "EXPENSE"] },
      occurredOn: { gte: monthStart, lt: nextMonthStart },
    },
  });

  let income = 0;
  let expense = 0;
  for (const row of grouped) {
    if (row.type === "INCOME") income = num(row._sum.amount);
    if (row.type === "EXPENSE") expense = num(row._sum.amount);
  }
  return { income, expense, savings: income - expense };
}

/** Monthly income & expense totals for the last `months` months (inclusive). */
async function getTrends(userId: string, months: number): Promise<TrendPoint[]> {
  const currentMonthStart = startOfMonthUTC(new Date());
  const rangeStart = addMonthsUTC(currentMonthStart, -(months - 1));

  // Group by month + type in the database; pivot in JS.
  const rows = await db.$queryRaw<
    Array<{ month: string; type: string; total: bigint }>
  >`
    SELECT to_char(date_trunc('month', occurred_on), 'YYYY-MM') AS month,
           type::text AS type,
           SUM(amount)::bigint AS total
    FROM transactions
    WHERE user_id = ${userId}::uuid
      AND type IN ('INCOME', 'EXPENSE')
      AND occurred_on >= ${rangeStart}
    GROUP BY 1, 2
    ORDER BY 1
  `;

  const byKey = new Map<string, { income: number; expense: number }>();
  for (const r of rows) {
    const entry = byKey.get(r.month) ?? { income: 0, expense: 0 };
    if (r.type === "INCOME") entry.income = num(r.total);
    else entry.expense = num(r.total);
    byKey.set(r.month, entry);
  }

  // Build a dense, ordered series so the chart has no gaps.
  const series: TrendPoint[] = [];
  const spansYears = rangeStart.getUTCFullYear() !== currentMonthStart.getUTCFullYear();
  for (let i = 0; i < months; i++) {
    const d = addMonthsUTC(rangeStart, i);
    const key = monthKey(d);
    const v = byKey.get(key) ?? { income: 0, expense: 0 };
    series.push({ key, label: monthLabel(d, spansYears), ...v });
  }
  return series;
}

/** Expense distribution by category for the current month (top 8 + Other). */
async function getCategoryDistribution(
  userId: string,
  monthStart: Date,
  nextMonthStart: Date,
): Promise<CategorySlice[]> {
  const grouped = await db.transaction.groupBy({
    by: ["categoryId"],
    _sum: { amount: true },
    where: {
      userId,
      type: "EXPENSE",
      occurredOn: { gte: monthStart, lt: nextMonthStart },
    },
    orderBy: { _sum: { amount: "desc" } },
  });

  const ids = grouped
    .map((g) => g.categoryId)
    .filter((id): id is string => id !== null);

  const categories = ids.length
    ? await db.category.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, color: true },
      })
    : [];
  const meta = new Map(categories.map((c) => [c.id, c]));

  const slices: CategorySlice[] = grouped.map((g) => {
    const c = g.categoryId ? meta.get(g.categoryId) : undefined;
    return {
      categoryId: g.categoryId,
      name: c?.name ?? "Uncategorized",
      color: c?.color ?? "#6B7280",
      total: num(g._sum.amount),
    };
  });

  // Collapse the long tail into a single "Other" slice.
  const TOP = 8;
  if (slices.length <= TOP) return slices;
  const head = slices.slice(0, TOP);
  const tailTotal = slices.slice(TOP).reduce((s, x) => s + x.total, 0);
  head.push({ categoryId: null, name: "Other", color: "#9CA3AF", total: tailTotal });
  return head;
}

/** The user's 10 most recent transactions. */
async function getRecentTransactions(
  userId: string,
): Promise<RecentTransaction[]> {
  const rows = await db.transaction.findMany({
    where: { userId },
    orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
    take: 10,
    select: {
      id: true,
      occurredOn: true,
      description: true,
      type: true,
      amount: true,
      account: { select: { name: true } },
      category: { select: { name: true, color: true } },
    },
  });

  return rows.map((t) => ({
    id: t.id,
    date: t.occurredOn.toISOString(),
    description: t.description,
    type: t.type,
    amount: num(t.amount),
    accountName: t.account.name,
    categoryName: t.category?.name ?? null,
    categoryColor: t.category?.color ?? null,
  }));
}

/** Single entry point — runs every query in parallel. */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  const monthStart = startOfMonthUTC(new Date());
  const nextMonthStart = addMonthsUTC(monthStart, 1);

  const [netWorth, month, trends, distribution, recent, budgets] =
    await Promise.all([
      getNetWorth(userId),
      getMonthSummary(userId, monthStart, nextMonthStart),
      getTrends(userId, 6),
      getCategoryDistribution(userId, monthStart, nextMonthStart),
      getRecentTransactions(userId),
      getBudgetOverview(userId, new Date()),
    ]);

  return {
    summary: {
      netWorth,
      income: month.income,
      expense: month.expense,
      savings: month.savings,
    },
    trends,
    distribution,
    recent,
    budgets,
  };
}
