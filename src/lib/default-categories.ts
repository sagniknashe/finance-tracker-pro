import type { CategoryType } from "@prisma/client";

/**
 * Canonical default category template. Copied into every newly registered
 * user's account (see user.service) and referenced by the seed script.
 */
export const DEFAULT_CATEGORIES: ReadonlyArray<{
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
}> = [
  // Income
  { name: "Salary", type: "INCOME", color: "#16A34A", icon: "wallet" },
  { name: "Freelance", type: "INCOME", color: "#22C55E", icon: "briefcase" },
  { name: "Investments", type: "INCOME", color: "#15803D", icon: "trending-up" },
  { name: "Other Income", type: "INCOME", color: "#4ADE80", icon: "plus-circle" },
  // Expense
  { name: "Housing", type: "EXPENSE", color: "#DC2626", icon: "home" },
  { name: "Groceries", type: "EXPENSE", color: "#EA580C", icon: "shopping-cart" },
  { name: "Dining", type: "EXPENSE", color: "#F59E0B", icon: "utensils" },
  { name: "Transport", type: "EXPENSE", color: "#0EA5E9", icon: "car" },
  { name: "Utilities", type: "EXPENSE", color: "#6366F1", icon: "zap" },
  { name: "Health", type: "EXPENSE", color: "#EC4899", icon: "heart" },
  { name: "Entertainment", type: "EXPENSE", color: "#8B5CF6", icon: "film" },
  { name: "Shopping", type: "EXPENSE", color: "#D946EF", icon: "shopping-bag" },
  { name: "Subscriptions", type: "EXPENSE", color: "#0D9488", icon: "repeat" },
  { name: "Other Expense", type: "EXPENSE", color: "#6B7280", icon: "more-horizontal" },
];
