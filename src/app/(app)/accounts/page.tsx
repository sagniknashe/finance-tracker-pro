import type { Metadata } from "next";

import { AccountsView } from "@/components/features/accounts/accounts-view";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/guards";
import { listAccounts } from "@/server/services/account.service";

export const metadata: Metadata = { title: "Accounts · Finance Tracker Pro" };
export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const sessionUser = await requireUser();

  const [accounts, user] = await Promise.all([
    listAccounts(sessionUser.id, true),
    db.user.findUnique({
      where: { id: sessionUser.id },
      select: { baseCurrency: true, locale: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <AccountsView
        initial={accounts}
        defaultCurrency={user?.baseCurrency ?? "USD"}
        locale={user?.locale ?? "en-US"}
      />
    </div>
  );
}
