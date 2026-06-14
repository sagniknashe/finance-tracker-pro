"use client";

import * as React from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ruleInputSchema } from "@/lib/validation/rule";
import type { RuleDTO } from "@/server/services/rule.service";
import type { CategoryOption } from "@/types/reference";

import { FIELD_OPERATORS, OPERATOR_LABEL, RULE_FIELDS, type UiField } from "./labels";

export function RuleForm({
  categories,
  initial,
  onSuccess,
  onCancel,
}: {
  categories: CategoryOption[];
  initial?: RuleDTO | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(initial);

  const [field, setField] = React.useState<UiField>(
    initial && initial.field === "AMOUNT" ? "AMOUNT" : "DESCRIPTION",
  );
  const [operator, setOperator] = React.useState(
    initial?.operator ?? "CONTAINS",
  );
  const [value, setValue] = React.useState(initial?.value ?? "");
  const [categoryId, setCategoryId] = React.useState(
    initial?.categoryId ?? categories[0]?.id ?? "",
  );
  const [priority, setPriority] = React.useState(String(initial?.priority ?? 100));
  const [isActive, setIsActive] = React.useState(initial?.isActive ?? true);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const operators = FIELD_OPERATORS[field];
  // Keep the operator valid for the selected field.
  React.useEffect(() => {
    if (!operators.includes(operator)) setOperator(operators[0]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      categoryId,
      field,
      operator,
      value,
      priority: Number(priority),
      isActive,
    };
    const parsed = ruleInputSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(
        isEdit ? `/api/rules/${initial!.id}` : "/api/rules",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not save rule");
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="rule-field">When</Label>
          <Select
            id="rule-field"
            value={field}
            onChange={(e) => setField(e.target.value as UiField)}
          >
            {RULE_FIELDS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rule-operator">Condition</Label>
          <Select
            id="rule-operator"
            value={operator}
            onChange={(e) =>
              setOperator(e.target.value as RuleDTO["operator"])
            }
          >
            {operators.map((op) => (
              <option key={op} value={op}>
                {OPERATOR_LABEL[op]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="rule-value">Value</Label>
        <Input
          id="rule-value"
          type={field === "AMOUNT" ? "number" : "text"}
          step={field === "AMOUNT" ? "0.01" : undefined}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={field === "AMOUNT" ? "e.g. 1000" : "e.g. SWIGGY"}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="rule-category">Assign category</Label>
          <Select
            id="rule-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type === "INCOME" ? "Income" : "Expense"})
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rule-priority">Priority</Label>
          <Input
            id="rule-priority"
            type="number"
            min="0"
            step="1"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Lower numbers are checked first.
          </p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        Active
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={pending}>
          {isEdit ? "Save changes" : "Add rule"}
        </Button>
      </div>
    </form>
  );
}
