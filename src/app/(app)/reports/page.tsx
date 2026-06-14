import type { Metadata } from "next";

import { ReportsView } from "@/components/features/reports/reports-view";
import { db } from "@/lib/db";
import { addMonthsUTC, startOfMonthUTC } from "@/lib/utils/dates";
import { requireUser } from "@/server/auth/guards";
import { getReports } from "@/server/services/reports.service";

export const metadata: Metadata = { title: "Reports · Finance Tracker Pro" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const sessionUser = await requireUser();

  // Default range: last 6 months (start of the month 5 months ago → today).
  const to = new Date();
  const from = startOfMonthUTC(addMonthsUTC(to, -5));

  const [data, user] = await Promise.all([
    getReports(sessionUser.id, from, to),
    db.user.findUnique({
      where: { id: sessionUser.id },
      select: { baseCurrency: true, locale: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <ReportsView
        initial={data}
        currency={user?.baseCurrency ?? "USD"}
        locale={user?.locale ?? "en-US"}
      />
    </div>
  );
}
