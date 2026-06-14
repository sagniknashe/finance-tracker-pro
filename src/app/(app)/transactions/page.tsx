import type { Metadata } from "next";

import { TransactionsView } from "@/components/features/transactions/transactions-view";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/guards";
import { listTransactions } from "@/server/services/transaction.service";

export const metadata: Metadata = { title: "Transactions · Finance Tracker Pro" };
export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const sessionUser = await requireUser();

  const [initialData, accounts, categories, user] = await Promise.all([
    listTransactions(sessionUser.id, { page: 1, pageSize: 20 }),
    db.account.findMany({
      where: { userId: sessionUser.id, isArchived: false },
      select: { id: true, name: true, currency: true },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({
      where: { userId: sessionUser.id },
      select: { id: true, name: true, type: true, color: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    db.user.findUnique({
      where: { id: sessionUser.id },
      select: { baseCurrency: true, locale: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <TransactionsView
        initialData={initialData}
        accounts={accounts}
        categories={categories}
        currency={user?.baseCurrency ?? "USD"}
        locale={user?.locale ?? "en-US"}
      />
    </div>
  );
}
