"use client";

import * as React from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CATEGORY_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import { categoryInputSchema } from "@/lib/validation/category";
import type { CategoryDTO } from "@/server/services/category.service";

type CatType = "INCOME" | "EXPENSE";

export function CategoryForm({
  categories,
  initial,
  onSuccess,
  onCancel,
}: {
  categories: CategoryDTO[];
  initial?: CategoryDTO | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(initial);

  const [type, setType] = React.useState<CatType>(
    (initial?.type as CatType) ?? "EXPENSE",
  );
  const [name, setName] = React.useState(initial?.name ?? "");
  const [color, setColor] = React.useState(initial?.color ?? CATEGORY_COLORS[0]);
  const [parentId, setParentId] = React.useState(initial?.parentId ?? "");
  const [icon, setIcon] = React.useState(initial?.icon ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  // Eligible parents: same type, top-level only, never the category itself.
  const parentOptions = categories.filter(
    (c) => c.type === type && c.parentId === null && c.id !== initial?.id,
  );
  React.useEffect(() => {
    if (parentId && !parentOptions.some((c) => c.id === parentId)) {
      setParentId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      name,
      type,
      color,
      icon: icon || null,
      parentId: parentId || null,
    };
    const parsed = categoryInputSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(
        isEdit ? `/api/categories/${initial!.id}` : "/api/categories",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not save category");
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

      <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
        {(["EXPENSE", "INCOME"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              type === t
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "EXPENSE" ? "Expense" : "Income"}
          </button>
        ))}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="cat-name">Name</Label>
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Groceries"
          maxLength={60}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label>Color</Label>
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Use color ${c}`}
              onClick={() => setColor(c)}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition",
                color.toLowerCase() === c.toLowerCase()
                  ? "border-foreground"
                  : "border-transparent",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="Custom color"
            className="h-7 w-9 cursor-pointer rounded border border-input bg-background"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="cat-parent">Parent (optional)</Label>
          <Select
            id="cat-parent"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">None (top level)</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cat-icon">Icon (optional)</Label>
          <Input
            id="cat-icon"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="e.g. shopping-cart"
            maxLength={40}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={pending}>
          {isEdit ? "Save changes" : "Add category"}
        </Button>
      </div>
    </form>
  );
}
