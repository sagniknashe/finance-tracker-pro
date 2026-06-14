import type { Metadata } from "next";

import { BudgetsView } from "@/components/features/budgets/budgets-view";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/guards";
import { listBudgets } from "@/server/services/budget.service";

export const metadata: Metadata = { title: "Budgets · Finance Tracker Pro" };
export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const sessionUser = await requireUser();
  const now = new Date();

  const [overview, expenseCategories, user] = await Promise.all([
    listBudgets(sessionUser.id, now),
    db.category.findMany({
      where: { userId: sessionUser.id, type: "EXPENSE" },
      select: { id: true, name: true, type: true, color: true },
      orderBy: { name: "asc" },
    }),
    db.user.findUnique({
      where: { id: sessionUser.id },
      select: { baseCurrency: true, locale: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <BudgetsView
        initial={overview}
        initialMonth={now.toISOString()}
        expenseCategories={expenseCategories}
        currency={user?.baseCurrency ?? "USD"}
        locale={user?.locale ?? "en-US"}
      />
    </div>
  );
}
