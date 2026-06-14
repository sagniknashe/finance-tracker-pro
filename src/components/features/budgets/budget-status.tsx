import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import type { BudgetStatus } from "@/server/services/budget.service";

/** Single source of truth for how each budget status looks. */
export const STATUS_META: Record<
  BudgetStatus,
  { label: string; badge: string; bar: string }
> = {
  OK: {
    label: "On track",
    badge: "bg-success/10 text-success",
    bar: "bg-success",
  },
  WARNING: {
    label: "Warning",
    badge: "bg-warning/10 text-warning",
    bar: "bg-warning",
  },
  EXCEEDED: {
    label: "Exceeded",
    badge: "bg-danger/10 text-danger",
    bar: "bg-danger",
  },
};

const ICONS = {
  OK: CheckCircle2,
  WARNING: AlertTriangle,
  EXCEEDED: XCircle,
} as const;

export function StatusBadge({ status }: { status: BudgetStatus }) {
  const meta = STATUS_META[status];
  const Icon = ICONS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        meta.badge,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {meta.label}
    </span>
  );
}
