/**
 * The full list of world currencies. Derived from the runtime's ICU data
 * (`Intl.supportedValuesOf('currency')`) so it covers every ISO-4217 code with
 * no hand-maintained list. Isomorphic (works on server and client).
 */
export interface CurrencyOption {
  code: string;
  name: string;
}

// Minimal fallback if the runtime predates Intl.supportedValuesOf (Node < 18).
const FALLBACK_CODES = [
  "USD", "EUR", "GBP", "INR", "JPY", "CNY", "AUD", "CAD", "CHF", "SGD",
  "AED", "SAR", "ZAR", "BRL", "MXN", "RUB", "KRW", "HKD", "NZD", "SEK",
];

export function listCurrencies(displayLocale = "en"): CurrencyOption[] {
  const intl = Intl as unknown as {
    supportedValuesOf?: (key: string) => string[];
  };
  const codes = intl.supportedValuesOf
    ? intl.supportedValuesOf("currency")
    : FALLBACK_CODES;

  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([displayLocale], { type: "currency" });
  } catch {
    names = null;
  }

  return codes
    .map((code) => ({ code, name: names?.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
