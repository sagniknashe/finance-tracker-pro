"use client";

import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { ACCOUNT_TYPE_LABEL } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils/cn";
import type { AccountDTO } from "@/server/services/account.service";

import { AccountForm } from "./account-form";

export function AccountsView({
  initial,
  defaultCurrency,
  locale,
}: {
  initial: AccountDTO[];
  defaultCurrency: string;
  locale: string;
}) {
  const [items, setItems] = React.useState(initial);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AccountDTO | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/accounts");
    if (res.ok) {
      const json = await res.json();
      setItems(json.data as AccountDTO[]);
    }
  }

  async function toggleArchive(a: AccountDTO) {
    setBusyId(a.id);
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: a.name,
          type: a.type,
          openingBalance: a.openingBalance / 100,
          currency: a.currency,
          isArchived: !a.isArchived,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message ?? "Could not update account");
        return;
      }
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(a: AccountDTO) {
    if (!window.confirm(`Delete account "${a.name}"?`)) return;
    setBusyId(a.id);
    setError(null);
    try {
      const res = await fetch(`/api/accounts/${a.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message ?? "Could not delete account");
        return;
      }
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  const totalBalance = items
    .filter((a) => !a.isArchived)
    .reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Total balance:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatMoney(totalBalance, defaultCurrency, locale)}
            </span>
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No accounts yet. Add HDFC, SBI, ICICI, Cash, a Credit Card, and more.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <Card
              key={a.id}
              className={cn(
                "flex flex-col gap-3 p-4",
                busyId === a.id && "opacity-50",
                a.isArchived && "border-dashed",
              )}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.name}</p>
                  <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {ACCOUNT_TYPE_LABEL[a.type]}
                    {a.isArchived ? " · Archived" : ""}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Balance</p>
                <p
                  className={cn(
                    "text-xl font-semibold tabular-nums",
                    a.balance < 0 ? "text-danger" : "text-foreground",
                  )}
                >
                  {formatMoney(a.balance, a.currency, locale)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {a.transactionCount} transaction
                  {a.transactionCount === 1 ? "" : "s"}
                </p>
              </div>

              <div className="flex items-center gap-1 border-t border-border pt-2">
                <button
                  type="button"
                  aria-label="Edit"
                  disabled={busyId === a.id}
                  onClick={() => {
                    setEditing(a);
                    setModalOpen(true);
                  }}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={a.isArchived ? "Unarchive" : "Archive"}
                  disabled={busyId === a.id}
                  onClick={() => toggleArchive(a)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  {a.isArchived ? (
                    <ArchiveRestore className="h-4 w-4" aria-hidden />
                  ) : (
                    <Archive className="h-4 w-4" aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  disabled={busyId === a.id}
                  onClick={() => onDelete(a)}
                  className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit account" : "Add account"}
      >
        <AccountForm
          initial={editing}
          defaultCurrency={defaultCurrency}
          onSuccess={() => {
            setModalOpen(false);
            setEditing(null);
            void refresh();
          }}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
        />
      </Modal>
    </div>
  );
}
