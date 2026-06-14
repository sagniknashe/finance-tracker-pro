/**
 * UTC date helpers. Transaction dates are stored in DATE columns (no timezone);
 * we operate in UTC so month boundaries line up with stored values regardless
 * of the server's local timezone.
 */

/** First instant of the month containing `d`, in UTC. */
export function startOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Add `n` months (may be negative) to `d`, preserving the day-1 anchor. */
export function addMonthsUTC(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

/** "YYYY-MM" key for grouping/lookup. */
export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Short human label, e.g. "Jan" or "Jan '25" when spanning years. */
export function monthLabel(d: Date, withYear = false): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: withYear ? "2-digit" : undefined,
    timeZone: "UTC",
  }).format(d);
}
