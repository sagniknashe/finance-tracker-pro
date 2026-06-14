/**
 * Budget domain service.
 *
 * A budget is a monthly spending limit for one EXPENSE category in one month
 * (rows are keyed by category + first-of-month). Consumption is derived live
 * from that month's expense transactions, so it always reflects current data.
 *
 * Status:
 *   - EXCEEDED  spent >= limit
 *   - WARNING   percent >= alertThreshold (default 80) but under the limit
 *   - OK        otherwise
 */
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { toMinor } from "@/lib/money";
import { addMonthsUTC, startOfMonthUTC } from "@/lib/utils/dates";
import type {
  BudgetCreateInput,
  BudgetUpdateInput,
} from "@/lib/validation/budget";
import { NotFoundError, ServiceValidationError } from "@/server/services/errors";

export type BudgetStatus = "OK" | "WARNING" | "EXCEEDED";

export interface BudgetDTO {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  month: string; // ISO date of the first of the month
  amount: number; // limit, minor units
  spent: number; // minor units
  remaining: number; // amount - spent (may be negative)
  percent: number; // 0..n, rounded
  alertThreshold: number;
  status: BudgetStatus;
}

export interface BudgetSummary {
  count: number;
  totalBudget: number;
  totalSpent: number;
  warningCount: number;
  overCount: number;
}

export interface BudgetOverview {
  summary: BudgetSummary;
  items: BudgetDTO[];
}

function statusOf(
  amount: number,
  spent: number,
  threshold: number,
): { percent: number; status: BudgetStatus } {
  const percent = amount > 0 ? Math.round((spent / amount) * 100) : 0;
  let status: BudgetStatus = "OK";
  if (spent >= amount) status = "EXCEEDED";
  else if (percent >= threshold) status = "WARNING";
  return { percent, status };
}

function summarize(items: BudgetDTO[]): BudgetSummary {
  return {
    count: items.length,
    totalBudget: items.reduce((s, b) => s + b.amount, 0),
    totalSpent: items.reduce((s, b) => s + b.spent, 0),
    warningCount: items.filter((b) => b.status === "WARNING").length,
    overCount: items.filter((b) => b.status === "EXCEEDED").length,
  };
}

/** Sum EXPENSE for a single category within a month window. */
async function sumSpent(
  userId: string,
  categoryId: string,
  monthStart: Date,
  nextMonthStart: Date,
): Promise<number> {
  const agg = await db.transaction.aggregate({
    _sum: { amount: true },
    where: {
      userId,
      type: "EXPENSE",
      categoryId,
      occurredOn: { gte: monthStart, lt: nextMonthStart },
    },
  });
  return Number(agg._sum.amount ?? 0);
}

/** Build the consumption DTOs for every budget in the given month. */
async function computeBudgets(
  userId: string,
  monthStart: Date,
): Promise<BudgetDTO[]> {
  const nextMonthStart = addMonthsUTC(monthStart, 1);

  const budgets = await db.budget.findMany({
    where: { userId, period: "MONTHLY", startMonth: monthStart },
    include: { category: { select: { name: true, color: true } } },
    orderBy: { category: { name: "asc" } },
  });
  if (budgets.length === 0) return [];

  const categoryIds = budgets.map((b) => b.categoryId);
  const grouped = await db.transaction.groupBy({
    by: ["categoryId"],
    _sum: { amount: true },
    where: {
      userId,
      type: "EXPENSE",
      categoryId: { in: categoryIds },
      occurredOn: { gte: monthStart, lt: nextMonthStart },
    },
  });
  const spentByCategory = new Map(
    grouped.map((g) => [g.categoryId, Number(g._sum.amount ?? 0)]),
  );

  return budgets.map((b) => {
    const amount = Number(b.amount);
    const spent = spentByCategory.get(b.categoryId) ?? 0;
    const { percent, status } = statusOf(amount, spent, b.alertThreshold);
    return {
      id: b.id,
      categoryId: b.categoryId,
      categoryName: b.category.name,
      categoryColor: b.category.color,
      month: b.startMonth.toISOString(),
      amount,
      spent,
      remaining: amount - spent,
      percent,
      alertThreshold: b.alertThreshold,
      status,
    };
  });
}

export async function listBudgets(
  userId: string,
  month: Date,
): Promise<BudgetOverview> {
  const items = await computeBudgets(userId, startOfMonthUTC(month));
  return { summary: summarize(items), items };
}

/** Compact overview for the dashboard: summary + the most-consumed budgets. */
export async function getBudgetOverview(
  userId: string,
  month: Date,
  topN = 5,
): Promise<BudgetOverview> {
  const items = await computeBudgets(userId, startOfMonthUTC(month));
  const sorted = [...items].sort((a, b) => b.percent - a.percent);
  return { summary: summarize(items), items: sorted.slice(0, topN) };
}

async function buildSingleDTO(
  userId: string,
  budget: {
    id: string;
    categoryId: string;
    amount: bigint;
    startMonth: Date;
    alertThreshold: number;
    category: { name: string; color: string };
  },
): Promise<BudgetDTO> {
  const monthStart = budget.startMonth;
  const spent = await sumSpent(
    userId,
    budget.categoryId,
    monthStart,
    addMonthsUTC(monthStart, 1),
  );
  const amount = Number(budget.amount);
  const { percent, status } = statusOf(amount, spent, budget.alertThreshold);
  return {
    id: budget.id,
    categoryId: budget.categoryId,
    categoryName: budget.category.name,
    categoryColor: budget.category.color,
    month: monthStart.toISOString(),
    amount,
    spent,
    remaining: amount - spent,
    percent,
    alertThreshold: budget.alertThreshold,
    status,
  };
}

export async function createBudget(
  userId: string,
  input: BudgetCreateInput,
): Promise<BudgetDTO> {
  const category = await db.category.findFirst({
    where: { id: input.categoryId, userId },
    select: { type: true },
  });
  if (!category) {
    throw new ServiceValidationError("Category not found", "categoryId");
  }
  if (category.type !== "EXPENSE") {
    throw new ServiceValidationError(
      "Budgets apply to expense categories only",
      "categoryId",
    );
  }

  const monthStart = startOfMonthUTC(input.month);

  try {
    const budget = await db.budget.create({
      data: {
        userId,
        categoryId: input.categoryId,
        amount: BigInt(toMinor(input.amount)),
        period: "MONTHLY",
        startMonth: monthStart,
        alertThreshold: input.alertThreshold,
      },
      include: { category: { select: { name: true, color: true } } },
    });
    return buildSingleDTO(userId, budget);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new ServiceValidationError(
        "A budget for this category already exists this month",
        "categoryId",
      );
    }
    throw err;
  }
}

export async function updateBudget(
  userId: string,
  id: string,
  input: BudgetUpdateInput,
): Promise<BudgetDTO> {
  const existing = await db.budget.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError("Budget not found");

  const budget = await db.budget.update({
    where: { id },
    data: {
      amount: BigInt(toMinor(input.amount)),
      alertThreshold: input.alertThreshold,
    },
    include: { category: { select: { name: true, color: true } } },
  });
  return buildSingleDTO(userId, budget);
}

export async function deleteBudget(userId: string, id: string): Promise<void> {
  const res = await db.budget.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw new NotFoundError("Budget not found");
}
