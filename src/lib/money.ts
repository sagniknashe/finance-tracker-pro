/**
 * Money helpers. Amounts are integer MINOR units (cents) everywhere in the app;
 * formatting to a localized currency string happens only at the display edge.
 *
 * This module is isomorphic (no server-only imports) so client chart components
 * can format tooltips/axes with the same logic as the server.
 */

/** Convert minor units (cents) to a major-unit number (dollars). */
export function toMajor(minor: number | bigint): number {
  return Number(minor) / 100;
}

/** Convert a major-unit number (dollars) to integer minor units (cents). */
export function toMinor(major: number): number {
  return Math.round(major * 100);
}

/** Format minor units as a localized currency string, e.g. "$1,234.56". */
export function formatMoney(
  minor: number | bigint,
  currency = "USD",
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(toMajor(minor));
}

/** Compact currency for dense chart axes, e.g. "$1.2k". */
export function formatMoneyCompact(
  minor: number | bigint,
  currency = "USD",
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(toMajor(minor));
}
