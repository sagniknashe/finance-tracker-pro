/** Shared, UI-facing constants. */
import type { AccountType } from "@prisma/client";

export const ACCOUNT_TYPE_OPTIONS: ReadonlyArray<{
  value: AccountType;
  label: string;
}> = [
  { value: "CHECKING", label: "Checking" },
  { value: "SAVINGS", label: "Savings" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "CASH", label: "Cash" },
  { value: "INVESTMENT", label: "Investment" },
];

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> =
  Object.fromEntries(
    ACCOUNT_TYPE_OPTIONS.map((o) => [o.value, o.label]),
  ) as Record<AccountType, string>;

/** A small palette offered in the category color picker. */
export const CATEGORY_COLORS = [
  "#DC2626", "#EA580C", "#F59E0B", "#16A34A", "#0D9488",
  "#0EA5E9", "#6366F1", "#8B5CF6", "#D946EF", "#EC4899",
  "#6B7280", "#22C55E",
] as const;
