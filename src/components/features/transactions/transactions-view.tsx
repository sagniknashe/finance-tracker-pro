"use client";

import { Plus } from "lucide-react";
import * as React from "react";

import { ExportMenu } from "@/components/features/export/export-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import type {
  TransactionDTO,
  TransactionListResult,
} from "@/server/services/transaction.service";
import type { AccountOption, CategoryOption } from "@/types/reference";

import { TransactionForm } from "./transaction-form";
import { TransactionTable } from "./transaction-table";

const PAGE_SIZE = 20;

interface Filters {
  search: string;
  type: "" | "INCOME" | "EXPENSE";
  accountId: string;
  categoryId: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: Filters = {
  search: "",
  type: "",
  accountId: "",
  categoryId: "",
  from: "",
  to: "",
};

function buildQuery(page: number, f: Filters): string {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("pageSize", String(PAGE_SIZE));
  if (f.search) p.set("search", f.search);
  if (f.type) p.set("type", f.type);
  if (f.accountId) p.set("accountId", f.accountId);
  if (f.categoryId) p.set("categoryId", f.categoryId);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  return p.toString();
}

export function TransactionsView({
  initialData,
  accounts,
  categories,
  currency,
  locale,
}: {
  initialData: TransactionListResult;
  accounts: AccountOption[];
  categories: CategoryOption[];
  currency: string;
  locale: string;
}) {
  const [result, setResult] = React.useState(initialData);
  const [page, setPage] = React.useState(initialData.page);
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [listError, setListError] = React.useState<string | null>(null);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TransactionDTO | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const filtersRef = React.useRef(filters);
  filtersRef.current = filters;

  const load = React.useCallback(async (p: number, f: Filters) => {
    setLoading(true);
    setListError(null);
    try {
      const res = await fetch(`/api/transactions?${buildQuery(p, f)}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setListError(json?.error?.message ?? "Failed to load transactions");
        return;
      }
      setResult(json as TransactionListResult);
    } catch {
      setListError("Network error while loading transactions");
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search — skip the initial mount (data is already seeded).
  const searchInited = React.useRef(false);
  React.useEffect(() => {
    if (!searchInited.current) {
      searchInited.current = true;
      return;
    }
    const id = setTimeout(() => {
      const next = { ...filtersRef.current, search: searchInput };
      setFilters(next);
      setPage(1);
      void load(1, next);
    }, 350);
    return () => clearTimeout(id);
  }, [searchInput, load]);

  function updateFilter(partial: Partial<Filters>) {
    const next = { ...filters, ...partial };
    setFilters(next);
    setPage(1);
    void load(1, next);
  }

  function resetFilters() {
    setSearchInput("");
    setFilters(EMPTY_FILTERS);
    setPage(1);
    void load(1, EMPTY_FILTERS);
  }

  function goToPage(p: number) {
    setPage(p);
    void load(p, filters);
  }

  // --- Row actions -----------------------------------------------------------
  function onFormSuccess() {
    const wasEdit = Boolean(editing);
    setModalOpen(false);
    setEditing(null);
    if (wasEdit) {
      void load(page, filters);
    } else {
      setPage(1);
      void load(1, filters);
    }
  }

  async function onDuplicate(tx: TransactionDTO) {
    setBusyId(tx.id);
    try {
      const res = await fetch(`/api/transactions/${tx.id}/duplicate`, {
        method: "POST",
      });
      if (res.ok) void load(page, filters);
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(tx: TransactionDTO) {
    if (!window.confirm("Delete this transaction? This cannot be undone.")) return;
    setBusyId(tx.id);
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, { method: "DELETE" });
      if (res.ok) {
        // If we just removed the last row on a non-first page, step back.
        const targetPage =
          result.data.length === 1 && page > 1 ? page - 1 : page;
        setPage(targetPage);
        void load(targetPage, filters);
      }
    } finally {
      setBusyId(null);
    }
  }

  const { totals } = result;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {result.total} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            type="transactions"
            params={{
              from: filters.from || undefined,
              to: filters.to || undefined,
              accountId: filters.accountId || undefined,
              categoryId: filters.categoryId || undefined,
              txnType: filters.type || undefined,
              search: filters.search || undefined,
            }}
          />
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

      {/* Totals for the current filter */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Income</p>
          <p className="font-semibold tabular-nums text-success">
            {formatMoney(totals.income, currency, locale)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Expense</p>
          <p className="font-semibold tabular-nums text-danger">
            {formatMoney(totals.expense, currency, locale)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Net</p>
          <p className="font-semibold tabular-nums">
            {formatMoney(totals.net, currency, locale)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Input
          placeholder="Search description…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="lg:col-span-2"
        />
        <Select
          value={filters.type}
          onChange={(e) => updateFilter({ type: e.target.value as Filters["type"] })}
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          <option value="INCOME">Income</option>
          <option value="EXPENSE">Expense</option>
        </Select>
        <Select
          value={filters.accountId}
          onChange={(e) => updateFilter({ accountId: e.target.value })}
          aria-label="Filter by account"
        >
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Select
          value={filters.categoryId}
          onChange={(e) => updateFilter({ categoryId: e.target.value })}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <Input
            type="date"
            value={filters.from}
            onChange={(e) => updateFilter({ from: e.target.value })}
            aria-label="From date"
          />
          <Input
            type="date"
            value={filters.to}
            onChange={(e) => updateFilter({ to: e.target.value })}
            aria-label="To date"
          />
        </div>
      </div>

      {(filters.search ||
        filters.type ||
        filters.accountId ||
        filters.categoryId ||
        filters.from ||
        filters.to) && (
        <div>
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Clear filters
          </Button>
        </div>
      )}

      {listError && (
        <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {listError}
        </div>
      )}

      <div className={loading ? "pointer-events-none opacity-60" : undefined}>
        <TransactionTable
          rows={result.data}
          currency={currency}
          locale={locale}
          busyId={busyId}
          onEdit={(tx) => {
            setEditing(tx);
            setModalOpen(true);
          }}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Page {result.page} of {result.totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={result.page <= 1 || loading}
            onClick={() => goToPage(result.page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={result.page >= result.totalPages || loading}
            onClick={() => goToPage(result.page + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit transaction" : "Add transaction"}
      >
        <TransactionForm
          accounts={accounts}
          categories={categories}
          initial={editing}
          onSuccess={onFormSuccess}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
        />
      </Modal>
    </div>
  );
}
