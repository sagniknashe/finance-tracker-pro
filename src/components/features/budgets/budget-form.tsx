"use client";

import * as React from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { budgetCreateSchema, budgetUpdateSchema } from "@/lib/validation/budget";
import type { BudgetDTO } from "@/server/services/budget.service";
import type { CategoryOption } from "@/types/reference";

export function BudgetForm({
  availableCategories,
  month,
  initial,
  onSuccess,
  onCancel,
}: {
  availableCategories: CategoryOption[];
  month: string; // ISO date for the selected month (create only)
  initial?: BudgetDTO | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(initial);

  const [categoryId, setCategoryId] = React.useState(
    initial?.categoryId ?? availableCategories[0]?.id ?? "",
  );
  const [amount, setAmount] = React.useState(
    initial ? (initial.amount / 100).toFixed(2) : "",
  );
  const [alertThreshold, setAlertThreshold] = React.useState(
    String(initial?.alertThreshold ?? 80),
  );
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isEdit) {
      const payload = {
        amount: Number(amount),
        alertThreshold: Number(alertThreshold),
      };
      const parsed = budgetUpdateSchema.safeParse(payload);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Please check the form");
        return;
      }
      await submit(`/api/budgets/${initial!.id}`, "PATCH", payload);
    } else {
      const payload = {
        categoryId,
        amount: Number(amount),
        month,
        alertThreshold: Number(alertThreshold),
      };
      const parsed = budgetCreateSchema.safeParse(payload);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Please check the form");
        return;
      }
      await submit("/api/budgets", "POST", payload);
    }
  }

  async function submit(url: string, method: string, payload: unknown) {
    setPending(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not save budget");
        setPending(false);
        return;
      }
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
      setPending(false);
    }
  }

  if (!isEdit && availableCategories.length === 0) {
    return (
      <div className="grid gap-4">
        <Alert>
          Every expense category already has a budget for this month.
        </Alert>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onCancel}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      {error && <Alert>{error}</Alert>}

      <div className="grid gap-2">
        <Label htmlFor="budget-category">Category</Label>
        {isEdit ? (
          <Input value={initial!.categoryName} disabled />
        ) : (
          <Select
            id="budget-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            {availableCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="budget-amount">Monthly limit</Label>
          <Input
            id="budget-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="budget-threshold">Warn at (%)</Label>
          <Input
            id="budget-threshold"
            type="number"
            min="1"
            max="100"
            step="1"
            value={alertThreshold}
            onChange={(e) => setAlertThreshold(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={pending}>
          {isEdit ? "Save changes" : "Add budget"}
        </Button>
      </div>
    </form>
  );
}
