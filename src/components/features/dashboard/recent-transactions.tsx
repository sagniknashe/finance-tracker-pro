import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/lib/money";
import type { RecentTransaction } from "@/server/services/dashboard.service";

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** Signed, color-coded amount. Income is positive, expense negative. */
function AmountText({
  tx,
  currency,
  locale,
}: {
  tx: RecentTransaction;
  currency: string;
  locale: string;
}) {
  const sign = tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "−" : "";
  const color =
    tx.type === "INCOME"
      ? "text-success"
      : tx.type === "EXPENSE"
        ? "text-danger"
        : "text-muted-foreground";
  return (
    <span className={cn("font-medium tabular-nums", color)}>
      {sign}
      {formatMoney(tx.amount, currency, locale)}
    </span>
  );
}

function CategoryBadge({ tx }: { tx: RecentTransaction }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: tx.categoryColor ?? "#9CA3AF" }}
        aria-hidden
      />
      {tx.categoryName ?? "Uncategorized"}
    </span>
  );
}

export function RecentTransactions({
  recent,
  currency,
  locale,
}: {
  recent: RecentTransaction[];
  currency: string;
  locale: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No transactions yet.
          </p>
        ) : (
          <>
            {/* Mobile: stacked rows */}
            <ul className="divide-y divide-border sm:hidden">
              {recent.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {tx.description || tx.categoryName || "Transaction"}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDate(tx.date, locale)}</span>
                      <span aria-hidden>·</span>
                      <span className="truncate">{tx.accountName}</span>
                    </div>
                  </div>
                  <AmountText tx={tx} currency={currency} locale={locale} />
                </li>
              ))}
            </ul>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Description</th>
                    <th className="py-2 pr-4 font-medium">Category</th>
                    <th className="py-2 pr-4 font-medium">Account</th>
                    <th className="py-2 pl-4 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recent.map((tx) => (
                    <tr key={tx.id}>
                      <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                        {formatDate(tx.date, locale)}
                      </td>
                      <td className="max-w-[16rem] truncate py-3 pr-4">
                        {tx.description || "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <CategoryBadge tx={tx} />
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {tx.accountName}
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <AmountText tx={tx} currency={currency} locale={locale} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
