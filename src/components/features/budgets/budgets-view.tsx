"use client";

import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import * as React from "react";

import { ExportMenu } from "@/components/features/export/export-menu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress";
import { formatMoney } from "@/lib/money";
import type { BudgetDTO, BudgetOverview } from "@/server/services/budget.service";
import type { CategoryOption } from "@/types/reference";

import { STATUS_META, StatusBadge } from "./budget-status";
import { BudgetForm } from "./budget-form";

/** "YYYY-MM-01" anchor for a month. */
function monthAnchor(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}
function shiftMonth(anchor: string, delta: number): string {
  const [y, m] = anchor.split("-").map(Number);
  return monthAnchor(new Date(Date.UTC(y!, m! - 1 + delta, 1)));
}
function monthTitle(anchor: string, locale: string): string {
  const [y, m] = anchor.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y!, m! - 1, 1)));
}

function BudgetCard({
  budget,
  currency,
  locale,
  busy,
  onEdit,
  onDelete,
}: {
  budget: BudgetDTO;
  currency: string;
  locale: string;
  busy: boolean;
  onEdit: (b: BudgetDTO) => void;
  onDelete: (b: BudgetDTO) => void;
}) {
  const meta = STATUS_META[budget.status];
  return (
    <Card className={`flex flex-col gap-3 p-4 ${busy ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: budget.categoryColor }}
            aria-hidden
          />
          <p className="truncate font-medium">{budget.categoryName}</p>
        </div>
        <StatusBadge status={budget.status} />
      </div>

      <ProgressBar percent={budget.percent} barClassName={meta.bar} />

      <div className="flex items-center justify-between text-sm">
        <span className="tabular-nums">
          {formatMoney(budget.spent, currency, locale)}{" "}
          <span className="text-muted-foreground">
            / {formatMoney(budget.amount, currency, locale)}
          </span>
        </span>
        <span
          className={
            budget.remaining < 0
              ? "font-medium text-danger"
              : "text-muted-foreground"
          }
        >
          {budget.remaining < 0
            ? `${formatMoney(-budget.remaining, currency, locale)} over`
            : `${formatMoney(budget.remaining, currency, locale)} left`}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-2">
        <span className="text-xs text-muted-foreground">
          {budget.percent}% · warn at {budget.alertThreshold}%
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Edit"
            disabled={busy}
            onClick={() => onEdit(budget)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Delete"
            disabled={busy}
            onClick={() => onDelete(budget)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </Card>
  );
}

export function BudgetsView({
  initial,
  initialMonth,
  expenseCategories,
  currency,
  locale,
}: {
  initial: BudgetOverview;
  initialMonth: string; // ISO date
  expenseCategories: CategoryOption[];
  currency: string;
  locale: string;
}) {
  const [month, setMonth] = React.useState(monthAnchor(new Date(initialMonth)));
  const [overview, setOverview] = React.useState(initial);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<BudgetDTO | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async (anchor: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/budgets?month=${anchor}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? "Failed to load budgets");
        return;
      }
      setOverview({ summary: json.summary, items: json.items });
    } catch {
      setError("Network error while loading budgets");
    } finally {
      setLoading(false);
    }
  }, []);

  function changeMonth(delta: number) {
    const next = shiftMonth(month, delta);
    setMonth(next);
    void load(next);
  }

  function refresh() {
    void load(month);
  }

  async function onDelete(b: BudgetDTO) {
    if (!window.confirm(`Delete the budget for "${b.categoryName}"?`)) return;
    setBusyId(b.id);
    try {
      const res = await fetch(`/api/budgets/${b.id}`, { method: "DELETE" });
      if (res.ok) refresh();
    } finally {
      setBusyId(null);
    }
  }

  const { summary, items } = overview;
  const budgetedIds = new Set(items.map((b) => b.categoryId));
  const available = expenseCategories.filter((c) => !budgetedIds.has(c.id));
  const totalRemaining = summary.totalBudget - summary.totalSpent;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground">
            Monthly limits by category.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => changeMonth(-1)}
              className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <span className="min-w-[8.5rem] text-center text-sm font-medium">
              {monthTitle(month, locale)}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => changeMonth(1)}
              className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <ExportMenu type="budgets" params={{ month }} size="sm" />
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
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total budget</p>
          <p className="font-semibold tabular-nums">
            {formatMoney(summary.totalBudget, currency, locale)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Spent</p>
          <p className="font-semibold tabular-nums text-danger">
            {formatMoney(summary.totalSpent, currency, locale)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p
            className={`font-semibold tabular-nums ${totalRemaining < 0 ? "text-danger" : "text-success"}`}
          >
            {formatMoney(totalRemaining, currency, locale)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Alerts</p>
          <p className="font-semibold tabular-nums">
            {summary.overCount} over · {summary.warningCount} warning
          </p>
        </Card>
      </div>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div
        className={loading ? "pointer-events-none opacity-60" : undefined}
      >
        {items.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            No budgets for {monthTitle(month, locale)}. Add one to start tracking.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((b) => (
              <BudgetCard
                key={b.id}
                budget={b}
                currency={currency}
                locale={locale}
                busy={busyId === b.id}
                onEdit={(budget) => {
                  setEditing(budget);
                  setModalOpen(true);
                }}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit budget" : "Add budget"}
      >
        <BudgetForm
          availableCategories={available}
          month={month}
          initial={editing}
          onSuccess={() => {
            setModalOpen(false);
            setEditing(null);
            refresh();
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
