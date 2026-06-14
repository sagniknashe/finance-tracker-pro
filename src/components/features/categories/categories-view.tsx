"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import type { CategoryDTO } from "@/server/services/category.service";

import { CategoryForm } from "./category-form";

function CategoryRow({
  category,
  busy,
  onEdit,
  onDelete,
}: {
  category: CategoryDTO;
  busy: boolean;
  onEdit: (c: CategoryDTO) => void;
  onDelete: (c: CategoryDTO) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3 ${busy ? "opacity-50" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: category.color }}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="truncate font-medium">
            {category.parentName ? (
              <span className="text-muted-foreground">
                {category.parentName} ·{" "}
              </span>
            ) : null}
            {category.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {category.transactionCount} transaction
            {category.transactionCount === 1 ? "" : "s"}
            {category.childCount > 0 ? ` · ${category.childCount} sub` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Edit"
          disabled={busy}
          onClick={() => onEdit(category)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Delete"
          disabled={busy}
          onClick={() => onDelete(category)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function CategoriesView({ initial }: { initial: CategoryDTO[] }) {
  const [items, setItems] = React.useState(initial);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CategoryDTO | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/categories");
    if (res.ok) {
      const json = await res.json();
      setItems(json.data as CategoryDTO[]);
    }
  }

  async function onDelete(c: CategoryDTO) {
    const msg =
      c.transactionCount > 0
        ? `Delete "${c.name}"? Its ${c.transactionCount} transaction(s) will become uncategorized.`
        : `Delete "${c.name}"?`;
    if (!window.confirm(msg)) return;

    setBusyId(c.id);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message ?? "Could not delete category");
        return;
      }
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  const income = items.filter((c) => c.type === "INCOME");
  const expense = items.filter((c) => c.type === "EXPENSE");

  const Group = ({ title, list }: { title: string; list: CategoryDTO[] }) => (
    <div className="grid gap-2">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      <Card>
        {list.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No categories yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {list.map((c) => (
              <CategoryRow
                key={c.id}
                category={c}
                busy={busyId === c.id}
                onEdit={(cat) => {
                  setEditing(cat);
                  setModalOpen(true);
                }}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Organize income and spending.
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Group title="Expense" list={expense} />
        <Group title="Income" list={income} />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit category" : "Add category"}
      >
        <CategoryForm
          categories={items}
          initial={editing}
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
