"use client";

import * as React from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ACCOUNT_TYPE_OPTIONS } from "@/lib/constants";
import { accountInputSchema } from "@/lib/validation/account";
import type { AccountDTO } from "@/server/services/account.service";

export function AccountForm({
  initial,
  defaultCurrency,
  onSuccess,
  onCancel,
}: {
  initial?: AccountDTO | null;
  defaultCurrency: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(initial);

  const [name, setName] = React.useState(initial?.name ?? "");
  const [type, setType] = React.useState(initial?.type ?? "CHECKING");
  const [openingBalance, setOpeningBalance] = React.useState(
    initial ? (initial.openingBalance / 100).toFixed(2) : "0.00",
  );
  const [currency, setCurrency] = React.useState(
    initial?.currency ?? defaultCurrency,
  );
  const [isArchived, setIsArchived] = React.useState(initial?.isArchived ?? false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      name,
      type,
      openingBalance: Number(openingBalance),
      currency,
      isArchived,
    };
    const parsed = accountInputSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(
        isEdit ? `/api/accounts/${initial!.id}` : "/api/accounts",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not save account");
        setPending(false);
        return;
      }
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      {error && <Alert>{error}</Alert>}

      <div className="grid gap-2">
        <Label htmlFor="acc-name">Account name</Label>
        <Input
          id="acc-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. HDFC, SBI, ICICI, Cash"
          maxLength={100}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="acc-type">Type</Label>
          <Select
            id="acc-type"
            value={type}
            onChange={(e) => setType(e.target.value as AccountDTO["type"])}
          >
            {ACCOUNT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="acc-currency">Currency</Label>
          <Input
            id="acc-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            maxLength={3}
            placeholder="USD"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="acc-opening">Opening balance</Label>
        <Input
          id="acc-opening"
          type="number"
          inputMode="decimal"
          step="0.01"
          value={openingBalance}
          onChange={(e) => setOpeningBalance(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Use a negative value for amounts owed (e.g. a credit card).
        </p>
      </div>

      {isEdit && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isArchived}
            onChange={(e) => setIsArchived(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          Archived (hidden from new transactions)
        </label>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={pending}>
          {isEdit ? "Save changes" : "Add account"}
        </Button>
      </div>
    </form>
  );
}
