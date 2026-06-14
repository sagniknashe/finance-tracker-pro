import { cn } from "@/lib/utils/cn";

/**
 * Simple, accessible progress bar. `percent` is clamped to [0, 100] for the
 * visual fill (overspend still shows a full red bar); pass `barClassName` to
 * color the fill.
 */
export function ProgressBar({
  percent,
  barClassName,
  className,
}: {
  percent: number;
  barClassName?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-all", barClassName ?? "bg-primary")}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
