import type { Metadata } from "next";

import { ImportHistory } from "@/components/features/import/import-history";
import { ImportWizard } from "@/components/features/import/import-wizard";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/guards";
import { listImportHistory } from "@/server/services/import.service";

export const metadata: Metadata = { title: "Import · Finance Tracker Pro" };
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const sessionUser = await requireUser();

  const [accounts, history, user] = await Promise.all([
    db.account.findMany({
      where: { userId: sessionUser.id, isArchived: false },
      select: { id: true, name: true, currency: true },
      orderBy: { name: "asc" },
    }),
    listImportHistory(sessionUser.id),
    db.user.findUnique({
      where: { id: sessionUser.id },
      select: { locale: true },
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import</h1>
        <p className="text-sm text-muted-foreground">
          Upload a bank statement, map the columns, preview, and import.
        </p>
      </div>

      <ImportWizard accounts={accounts} locale={user?.locale ?? "en-US"} />
      <ImportHistory items={history} />
    </div>
  );
}
