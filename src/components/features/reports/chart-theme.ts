/** Shared Recharts styling so axes/tooltips follow the app theme. */
export const AXIS_TICK = {
  fill: "hsl(var(--muted-foreground))",
  fontSize: 12,
} as const;

export const GRID_STROKE = "hsl(var(--border))";

export const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.5rem",
  color: "hsl(var(--card-foreground))",
  fontSize: 12,
} as const;

export const INCOME_COLOR = "#16A34A";
export const EXPENSE_COLOR = "#DC2626";
export const PRIMARY_COLOR = "#6366F1";
export const ACCENT_COLOR = "#0EA5E9";
