"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import type { CountryData } from "@/lib/i18n/countries";
import type { CurrencyOption } from "@/lib/i18n/currencies";

export function OnboardingForm({
  countries,
  currencies,
}: {
  countries: CountryData[];
  currencies: CurrencyOption[];
}) {
  const router = useRouter();
  const [country, setCountry] = React.useState("");
  const [currency, setCurrency] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  // Selecting a country pre-fills its currency (the user can still change it).
  function onCountryChange(code: string) {
    setCountry(code);
    const c = countries.find((x) => x.code === code);
    if (c) setCurrency(c.currency);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!country || !currency) {
      setError("Please choose your country and currency.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, currency }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not save your preferences");
        setPending(false);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      {error && <Alert>{error}</Alert>}

      <div className="grid gap-2">
        <Label htmlFor="country">Country</Label>
        <Select
          id="country"
          value={country}
          onChange={(e) => onCountryChange(e.target.value)}
          required
        >
          <option value="" disabled>
            Select your country…
          </option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="currency">Currency</Label>
        <Select
          id="currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          required
        >
          <option value="" disabled>
            Select your currency…
          </option>
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name}
            </option>
          ))}
        </Select>
        {currency && (
          <p className="text-xs text-muted-foreground">
            Amounts will look like{" "}
            <span className="font-medium text-foreground">
              {formatMoney(123456, currency, country ? `en-${country}` : "en")}
            </span>
            .
          </p>
        )}
      </div>

      <Button type="submit" isLoading={pending} className="w-full">
        Continue to dashboard
      </Button>
    </form>
  );
}
