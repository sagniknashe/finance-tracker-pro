/**
 * Export service: assembles a generic ExportDataset for each exportable view
 * (transactions / budgets / monthly summary), then encodes it to CSV / XLSX /
 * PDF. Reuses the existing read services so exports always match the on-screen
 * data.
 */
import { db } from "@/lib/db";
import { encode } from "@/lib/export/encoders";
import {
  CONTENT_TYPE,
  FILE_EXTENSION,
  type ExportDataset,
} from "@/lib/export/types";
import { addMonthsUTC, startOfMonthUTC } from "@/lib/utils/dates";
import type { ExportQuery } from "@/lib/validation/export";
import { listBudgets } from "@/server/services/budget.service";
import { getMonthlySummaryRange } from "@/server/services/reports.service";
import { getAllTransactions } from "@/server/services/transaction.service";

function shortDate(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

function rangeSubtitle(from: Date | undefined, to: Date | undefined, locale: string) {
  if (from && to) return `${shortDate(from, locale)} – ${shortDate(to, locale)}`;
  if (from) return `From ${shortDate(from, locale)}`;
  if (to) return `Until ${shortDate(to, locale)}`;
  return "All time";
}

async function userPrefs(userId: string) {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { baseCurrency: true, locale: true },
  });
  return { currency: u?.baseCurrency ?? "USD", locale: u?.locale ?? "en-US" };
}

async function transactionsDataset(
  userId: string,
  q: ExportQuery,
  currency: string,
  locale: string,
): Promise<ExportDataset> {
  const rows = await getAllTransactions(userId, {
    type: q.txnType,
    accountId: q.accountId,
    categoryId: q.categoryId,
    search: q.search,
    from: q.from,
    to: q.to,
  });

  return {
    title: "Transactions",
    subtitle: rangeSubtitle(q.from, q.to, locale),
    currency,
    locale,
    columns: [
      { key: "date", label: "Date", type: "text" },
      { key: "description", label: "Description", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "account", label: "Account", type: "text" },
      { key: "type", label: "Type", type: "text" },
      { key: "amount", label: "Amount", type: "money" },
    ],
    rows: rows.map((t) => ({
      date: t.date.slice(0, 10),
      description: t.description || "",
      category: t.categoryName ?? "Uncategorized",
      account: t.accountName,
      type: t.type === "INCOME" ? "Income" : "Expense",
      // Signed so spreadsheets can total a column directly.
      amount: t.type === "EXPENSE" ? -t.amount : t.amount,
    })),
  };
}

async function budgetsDataset(
  userId: string,
  q: ExportQuery,
  currency: string,
  locale: string,
): Promise<ExportDataset> {
  const month = q.month ?? new Date();
  const overview = await listBudgets(userId, month);
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(startOfMonthUTC(month));

  return {
    title: "Budgets",
    subtitle: monthLabel,
    currency,
    locale,
    columns: [
      { key: "category", label: "Category", type: "text" },
      { key: "limit", label: "Limit", type: "money" },
      { key: "spent", label: "Spent", type: "money" },
      { key: "remaining", label: "Remaining", type: "money" },
      { key: "used", label: "Used %", type: "number" },
      { key: "status", label: "Status", type: "text" },
    ],
    rows: overview.items.map((b) => ({
      category: b.categoryName,
      limit: b.amount,
      spent: b.spent,
      remaining: b.remaining,
      used: b.percent,
      status:
        b.status === "EXCEEDED"
          ? "Exceeded"
          : b.status === "WARNING"
            ? "Warning"
            : "On track",
    })),
  };
}

async function monthlyDataset(
  userId: string,
  q: ExportQuery,
  currency: string,
  locale: string,
): Promise<ExportDataset> {
  const to = q.to ?? new Date();
  const from = q.from ?? startOfMonthUTC(addMonthsUTC(to, -5));
  const report = await getMonthlySummaryRange(userId, from, to);

  return {
    title: "Monthly Summary",
    subtitle: rangeSubtitle(from, to, locale),
    currency,
    locale,
    columns: [
      { key: "month", label: "Month", type: "text" },
      { key: "income", label: "Income", type: "money" },
      { key: "expense", label: "Expense", type: "money" },
      { key: "net", label: "Net", type: "money" },
      { key: "savings", label: "Savings %", type: "number" },
    ],
    rows: report.rows.map((r) => ({
      month: r.label,
      income: r.income,
      expense: r.expense,
      net: r.net,
      savings: r.savingsRate,
    })),
  };
}

export async function buildExport(
  userId: string,
  q: ExportQuery,
): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  const { currency, locale } = await userPrefs(userId);

  const dataset =
    q.type === "transactions"
      ? await transactionsDataset(userId, q, currency, locale)
      : q.type === "budgets"
        ? await budgetsDataset(userId, q, currency, locale)
        : await monthlyDataset(userId, q, currency, locale);

  const buffer = encode(dataset, q.format);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${q.type}-${date}.${FILE_EXTENSION[q.format]}`;

  return { buffer, contentType: CONTENT_TYPE[q.format], filename };
}
