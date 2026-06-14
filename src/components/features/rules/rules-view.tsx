"use client";

import { Pencil, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils/cn";
import type { RuleDTO } from "@/server/services/rule.service";
import type { CategoryOption } from "@/types/reference";

import { FIELD_LABEL, OPERATOR_LABEL } from "./labels";
import { RuleForm } from "./rule-form";

function ruleSentence(rule: RuleDTO): string {
  const value = rule.field === "AMOUNT" ? rule.value : `"${rule.value}"`;
  return `${FIELD_LABEL[rule.field]} ${OPERATOR_LABEL[rule.operator]} ${value}`;
}

export function RulesView({
  initial,
  categories,
}: {
  initial: RuleDTO[];
  categories: CategoryOption[];
}) {
  const [rules, setRules] = React.useState(initial);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<RuleDTO | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [busyAction, setBusyAction] = React.useState<"apply" | "seed" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/rules");
    if (res.ok) {
      const json = await res.json();
      setRules(json.data as RuleDTO[]);
    }
  }

  async function toggleActive(rule: RuleDTO) {
    setBusyId(rule.id);
    setError(null);
    try {
      const res = await fetch(`/api/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: rule.categoryId,
          field: rule.field,
          operator: rule.operator,
          value: rule.value,
          priority: rule.priority,
          isActive: !rule.isActive,
        }),
      });
      if (res.ok) await refresh();
      else setError("Could not update rule");
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(rule: RuleDTO) {
    if (!window.confirm("Delete this rule?")) return;
    setBusyId(rule.id);
    try {
      const res = await fetch(`/api/rules/${rule.id}`, { method: "DELETE" });
      if (res.ok) await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function addStarterRules() {
    setBusyAction("seed");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/rules/seed", { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not add starter rules");
        return;
      }
      setMessage(`Added ${json.data.created} starter rule(s).`);
      await refresh();
    } finally {
      setBusyAction(null);
    }
  }

  async function applyToExisting() {
    setBusyAction("apply");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/rules/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not apply rules");
        return;
      }
      setMessage(
        json.data.updated > 0
          ? `Categorized ${json.data.updated} uncategorized transaction(s).`
          : "No uncategorized transactions matched your rules.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Smart Categorization
          </h1>
          <p className="text-sm text-muted-foreground">
            Auto-assign categories to matching transactions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={addStarterRules}
            isLoading={busyAction === "seed"}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Starter rules
          </Button>
          <Button
            variant="outline"
            onClick={applyToExisting}
            isLoading={busyAction === "apply"}
            disabled={rules.length === 0}
          >
            <Wand2 className="h-4 w-4" aria-hidden />
            Apply to existing
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add rule
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success">
          {message}
        </div>
      )}

      {rules.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No rules yet. Add the starter rules (SWIGGY → Food, AMAZON → Shopping…)
          or create your own.
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-border">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={cn(
                  "flex items-center justify-between gap-3 px-4 py-3",
                  busyId === rule.id && "opacity-50",
                  !rule.isActive && "opacity-60",
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="hidden w-10 shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
                    #{rule.priority}
                  </span>
                  <p className="truncate text-sm">
                    <span className="text-muted-foreground">If </span>
                    {ruleSentence(rule)}
                    <span className="text-muted-foreground"> → </span>
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full align-middle"
                        style={{ backgroundColor: rule.categoryColor }}
                        aria-hidden
                      />
                      {rule.categoryName}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={rule.isActive}
                      disabled={busyId === rule.id}
                      onChange={() => toggleActive(rule)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="hidden sm:inline">Active</span>
                  </label>
                  <button
                    type="button"
                    aria-label="Edit"
                    disabled={busyId === rule.id}
                    onClick={() => {
                      setEditing(rule);
                      setModalOpen(true);
                    }}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete"
                    disabled={busyId === rule.id}
                    onClick={() => onDelete(rule)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit rule" : "Add rule"}
      >
        <RuleForm
          categories={categories}
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
