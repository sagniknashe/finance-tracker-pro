"use client";

import * as React from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";
import { transactionInputSchema } from "@/lib/validation/transaction";
import type { TransactionDTO } from "@/server/services/transaction.service";
import type { AccountOption, CategoryOption } from "@/types/reference";

type TxType = "INCOME" | "EXPENSE";

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Add/Edit form. When `initial` is provided it edits (PATCH); otherwise it
 *  creates (POST). Calls `onSuccess` with the saved transaction. */
export function TransactionForm({
  accounts,
  categories,
  initial,
  onSuccess,
  onCancel,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  initial?: TransactionDTO | null;
  onSuccess: (tx: TransactionDTO) => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(initial);

  const [type, setType] = React.useState<TxType>(
    (initial?.type as TxType) ?? "EXPENSE",
  );
  const [date, setDate] = React.useState(
    initial ? initial.date.slice(0, 10) : todayISODate(),
  );
  const [amount, setAmount] = React.useState(
    initial ? (initial.amount / 100).toFixed(2) : "",
  );
  const [accountId, setAccountId] = React.useState(
    initial?.accountId ?? accounts[0]?.id ?? "",
  );
  const [categoryId, setCategoryId] = React.useState(initial?.categoryId ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [notes, setNotes] = React.useState(initial?.notes ?? "");

  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  // Categories valid for the selected type. Reset the selection if it no longer
  // matches (e.g. user flips Expense → Income).
  const typeCategories = categories.filter((c) => c.type === type);
  React.useEffect(() => {
    if (categoryId && !typeCategories.some((c) => c.id === categoryId)) {
      setCategoryId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      type,
      date,
      amount: Number(amount),
      accountId,
      categoryId: categoryId || null,
      description,
      notes: notes || null,
    };

    const parsed = transactionInputSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(
        isEdit ? `/api/transactions/${initial!.id}` : "/api/transactions",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not save transaction");
        setPending(false);
        return;
      }
      onSuccess(json.data as TransactionDTO);
    } catch {
      setError("Network error. Please try again.");
      setPending(false);
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="grid gap-4">
        <Alert>You need to create an account before adding transactions.</Alert>
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

      {/* Income / Expense toggle */}
      <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
        {(["EXPENSE", "INCOME"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              type === t
                ? t === "INCOME"
                  ? "bg-card text-success shadow-sm"
                  : "bg-card text-danger shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "EXPENSE" ? "Expense" : "Income"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
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
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="account">Account</Label>
          <Select
            id="account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="category">Category</Label>
          <Select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Uncategorized</option>
            {typeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Grocery shopping"
          maxLength={200}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
          maxLength={1000}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={pending}>
          {isEdit ? "Save changes" : "Add transaction"}
        </Button>
      </div>
    </form>
  );
}
