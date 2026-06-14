/**
 * Reporting read model. Produces four reports for a date range:
 *   - Monthly Summary  (income / expense / net / savings rate per month)
 *   - Category Report  (totals + share + count per category, by type)
 *   - Account Report   (in-range flows + current balance per account)
 *   - Savings Report   (monthly + cumulative savings, savings rate)
 *
 * All amounts are returned as plain numbers (minor units) for safe
 * serialization to the client.
 */
import type { AccountType, CategoryType } from "@prisma/client";

import { db } from "@/lib/db";
import {
  addMonthsUTC,
  monthKey,
  monthLabel,
  startOfMonthUTC,
} from "@/lib/utils/dates";

const num = (v: bigint | number | null | undefined) => Number(v ?? 0);

// ----- Monthly aggregation (shared by Monthly Summary + Savings) -------------
interface MonthAgg {
  key: string;
  label: string;
  income: number;
  expense: number;
}

async function getMonthlyAggregates(
  userId: string,
  from: Date,
  to: Date,
): Promise<MonthAgg[]> {
  const firstMonth = startOfMonthUTC(from);
  const lastMonth = startOfMonthUTC(to);
  const endExclusive = addMonthsUTC(lastMonth, 1);

  const rows = await db.$queryRaw<
    Array<{ month: string; type: string; total: bigint }>
  >`
    SELECT to_char(date_trunc('month', occurred_on), 'YYYY-MM') AS month,
           type::text AS type,
           SUM(amount)::bigint AS total
    FROM transactions
    WHERE user_id = ${userId}::uuid
      AND type IN ('INCOME', 'EXPENSE')
      AND occurred_on >= ${firstMonth}
      AND occurred_on < ${endExclusive}
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

  const spansYears = firstMonth.getUTCFullYear() !== lastMonth.getUTCFullYear();
  const out: MonthAgg[] = [];
  for (let d = firstMonth; d < endExclusive; d = addMonthsUTC(d, 1)) {
    const key = monthKey(d);
    const v = byKey.get(key) ?? { income: 0, expense: 0 };
    out.push({ key, label: monthLabel(d, spansYears), ...v });
  }
  return out;
}

const savingsRate = (income: number, net: number) =>
  income > 0 ? Math.round((net / income) * 100) : 0;

// ----- Monthly Summary -------------------------------------------------------
export interface MonthlySummaryRow {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
}
export interface MonthlySummaryReport {
  rows: MonthlySummaryRow[];
  totals: { income: number; expense: number; net: number };
}

function buildMonthlySummary(months: MonthAgg[]): MonthlySummaryReport {
  const rows = months.map((m) => {
    const net = m.income - m.expense;
    return { ...m, net, savingsRate: savingsRate(m.income, net) };
  });
  const income = rows.reduce((s, r) => s + r.income, 0);
  const expense = rows.reduce((s, r) => s + r.expense, 0);
  return { rows, totals: { income, expense, net: income - expense } };
}

/** Monthly summary for a range — used by the export endpoint. */
export async function getMonthlySummaryRange(
  userId: string,
  from: Date,
  to: Date,
): Promise<MonthlySummaryReport> {
  return buildMonthlySummary(await getMonthlyAggregates(userId, from, to));
}

// ----- Savings Report --------------------------------------------------------
export interface SavingsReportRow {
  key: string;
  label: string;
  savings: number;
  cumulative: number;
  savingsRate: number;
}
export interface SavingsReport {
  rows: SavingsReportRow[];
  totalSavings: number;
  avgSavingsRate: number;
}

function buildSavings(months: MonthAgg[]): SavingsReport {
  let cumulative = 0;
  const rows = months.map((m) => {
    const savings = m.income - m.expense;
    cumulative += savings;
    return {
      key: m.key,
      label: m.label,
      savings,
      cumulative,
      savingsRate: savingsRate(m.income, savings),
    };
  });
  const totalSavings = cumulative;
  const avgSavingsRate = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.savingsRate, 0) / rows.length)
    : 0;
  return { rows, totalSavings, avgSavingsRate };
}

// ----- Category Report -------------------------------------------------------
export interface CategoryReportRow {
  categoryId: string | null;
  name: string;
  color: string;
  type: CategoryType;
  total: number;
  count: number;
  percent: number; // share within its type
}
export interface CategoryReport {
  rows: CategoryReportRow[];
  totalIncome: number;
  totalExpense: number;
}

async function getCategoryReport(
  userId: string,
  from: Date,
  to: Date,
): Promise<CategoryReport> {
  const grouped = await db.transaction.groupBy({
    by: ["categoryId", "type"],
    _sum: { amount: true },
    _count: { _all: true },
    where: {
      userId,
      type: { in: ["INCOME", "EXPENSE"] },
      occurredOn: { gte: from, lte: to },
    },
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

  let totalIncome = 0;
  let totalExpense = 0;
  for (const g of grouped) {
    const total = num(g._sum.amount);
    if (g.type === "INCOME") totalIncome += total;
    else totalExpense += total;
  }

  const rows: CategoryReportRow[] = grouped.map((g) => {
    const total = num(g._sum.amount);
    const denom = g.type === "INCOME" ? totalIncome : totalExpense;
    const c = g.categoryId ? meta.get(g.categoryId) : undefined;
    return {
      categoryId: g.categoryId,
      name: c?.name ?? "Uncategorized",
      color: c?.color ?? "#9CA3AF",
      type: g.type as CategoryType,
      total,
      count: g._count._all,
      percent: denom > 0 ? Math.round((total / denom) * 100) : 0,
    };
  });
  rows.sort((a, b) => b.total - a.total);

  return { rows, totalIncome, totalExpense };
}

// ----- Account Report --------------------------------------------------------
export interface AccountReportRow {
  accountId: string;
  name: string;
  type: AccountType;
  income: number;
  expense: number;
  net: number;
  balance: number; // current overall balance (not range-limited)
}
export interface AccountReport {
  rows: AccountReportRow[];
  totals: { income: number; expense: number; net: number };
}

async function getAccountReport(
  userId: string,
  from: Date,
  to: Date,
): Promise<AccountReport> {
  const [accounts, rangeFlows, allFlows] = await Promise.all([
    db.account.findMany({
      where: { userId },
      select: { id: true, name: true, type: true, openingBalance: true },
      orderBy: [{ isArchived: "asc" }, { name: "asc" }],
    }),
    db.transaction.groupBy({
      by: ["accountId", "type"],
      _sum: { amount: true },
      where: { userId, occurredOn: { gte: from, lte: to } },
    }),
    db.transaction.groupBy({
      by: ["accountId", "type"],
      _sum: { amount: true },
      where: { userId },
    }),
  ]);

  const toMap = (flows: typeof rangeFlows) => {
    const m = new Map<string, { income: number; expense: number }>();
    for (const g of flows) {
      const e = m.get(g.accountId) ?? { income: 0, expense: 0 };
      if (g.type === "INCOME") e.income = num(g._sum.amount);
      if (g.type === "EXPENSE") e.expense = num(g._sum.amount);
      m.set(g.accountId, e);
    }
    return m;
  };
  const rangeMap = toMap(rangeFlows);
  const allMap = toMap(allFlows);

  const rows: AccountReportRow[] = accounts.map((a) => {
    const r = rangeMap.get(a.id) ?? { income: 0, expense: 0 };
    const all = allMap.get(a.id) ?? { income: 0, expense: 0 };
    const opening = num(a.openingBalance);
    return {
      accountId: a.id,
      name: a.name,
      type: a.type,
      income: r.income,
      expense: r.expense,
      net: r.income - r.expense,
      balance: opening + all.income - all.expense,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      income: acc.income + r.income,
      expense: acc.expense + r.expense,
      net: acc.net + r.net,
    }),
    { income: 0, expense: 0, net: 0 },
  );

  return { rows, totals };
}

// ----- Aggregate entry point -------------------------------------------------
export interface ReportsData {
  range: { from: string; to: string };
  monthly: MonthlySummaryReport;
  savings: SavingsReport;
  category: CategoryReport;
  account: AccountReport;
}

export async function getReports(
  userId: string,
  from: Date,
  to: Date,
): Promise<ReportsData> {
  const [months, category, account] = await Promise.all([
    getMonthlyAggregates(userId, from, to),
    getCategoryReport(userId, from, to),
    getAccountReport(userId, from, to),
  ]);

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    monthly: buildMonthlySummary(months),
    savings: buildSavings(months),
    category,
    account,
  };
}
