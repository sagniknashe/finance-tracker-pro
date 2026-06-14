"use client";

import { Copy, Pencil, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/lib/money";
import type { TransactionDTO } from "@/server/services/transaction.service";

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

function Amount({
  tx,
  currency,
  locale,
}: {
  tx: TransactionDTO;
  currency: string;
  locale: string;
}) {
  const sign = tx.type === "INCOME" ? "+" : "−";
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        tx.type === "INCOME" ? "text-success" : "text-danger",
      )}
    >
      {sign}
      {formatMoney(tx.amount, currency, locale)}
    </span>
  );
}

export function TransactionTable({
  rows,
  currency,
  locale,
  busyId,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  rows: TransactionDTO[];
  currency: string;
  locale: string;
  busyId: string | null;
  onEdit: (tx: TransactionDTO) => void;
  onDuplicate: (tx: TransactionDTO) => void;
  onDelete: (tx: TransactionDTO) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        No transactions match your filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-border text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">Category</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">Account</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((tx) => (
            <tr
              key={tx.id}
              className={cn(
                "transition-colors hover:bg-muted/50",
                busyId === tx.id && "opacity-50",
              )}
            >
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                {formatDate(tx.date, locale)}
              </td>
              <td className="max-w-[18rem] truncate px-4 py-3">
                {tx.description || "—"}
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: tx.categoryColor ?? "#9CA3AF" }}
                    aria-hidden
                  />
                  {tx.categoryName ?? "Uncategorized"}
                </span>
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                {tx.accountName}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <Amount tx={tx} currency={currency} locale={locale} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    aria-label="Edit"
                    disabled={busyId === tx.id}
                    onClick={() => onEdit(tx)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label="Duplicate"
                    disabled={busyId === tx.id}
                    onClick={() => onDuplicate(tx)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete"
                    disabled={busyId === tx.id}
                    onClick={() => onDelete(tx)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
