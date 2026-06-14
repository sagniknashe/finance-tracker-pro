"use client";

import * as React from "react";

import { ExportMenu } from "@/components/features/export/export-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { ReportsData } from "@/server/services/reports.service";

import { AccountReport } from "./account-report";
import { CategoryReport } from "./category-report";
import { MonthlySummaryReport } from "./monthly-summary-report";
import { SavingsReport } from "./savings-report";

type TabKey = "monthly" | "category" | "account" | "savings";

const TABS: { key: TabKey; label: string }[] = [
  { key: "monthly", label: "Monthly Summary" },
  { key: "category", label: "Category" },
  { key: "account", label: "Account" },
  { key: "savings", label: "Savings" },
];

type PresetKey = "3m" | "6m" | "12m" | "ytd";
const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "12m", label: "12M" },
  { key: "ytd", label: "YTD" },
];

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

function presetRange(kind: PresetKey): { from: string; to: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const to = isoDate(now);
  switch (kind) {
    case "3m":
      return { from: isoDate(new Date(Date.UTC(y, m - 2, 1))), to };
    case "6m":
      return { from: isoDate(new Date(Date.UTC(y, m - 5, 1))), to };
    case "12m":
      return { from: isoDate(new Date(Date.UTC(y, m - 11, 1))), to };
    case "ytd":
      return { from: isoDate(new Date(Date.UTC(y, 0, 1))), to };
  }
}

export function ReportsView({
  initial,
  currency,
  locale,
}: {
  initial: ReportsData;
  currency: string;
  locale: string;
}) {
  const [data, setData] = React.useState(initial);
  const [from, setFrom] = React.useState(initial.range.from.slice(0, 10));
  const [to, setTo] = React.useState(initial.range.to.slice(0, 10));
  const [tab, setTab] = React.useState<TabKey>("monthly");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async (f: string, t: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports?from=${f}&to=${t}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message ?? "Failed to load reports");
        return;
      }
      setData(json as ReportsData);
    } catch {
      setError("Network error while loading reports");
    } finally {
      setLoading(false);
    }
  }, []);

  function applyRange(f: string, t: string) {
    setFrom(f);
    setTo(t);
    void load(f, t);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Analyze income, spending and savings over time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {PRESETS.map((p) => (
              <Button
                key={p.key}
                variant="outline"
                size="sm"
                onClick={() => {
                  const r = presetRange(p.key);
                  applyRange(r.from, r.to);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={from}
              max={to}
              onChange={(e) => applyRange(e.target.value, to)}
              aria-label="From date"
            />
            <span className="text-muted-foreground">→</span>
            <Input
              type="date"
              value={to}
              min={from}
              onChange={(e) => applyRange(from, e.target.value)}
              aria-label="To date"
            />
          </div>
          <ExportMenu type="monthly" params={{ from, to }} size="sm" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className={loading ? "pointer-events-none opacity-60" : undefined}>
        {tab === "monthly" && (
          <MonthlySummaryReport report={data.monthly} currency={currency} locale={locale} />
        )}
        {tab === "category" && (
          <CategoryReport report={data.category} currency={currency} locale={locale} />
        )}
        {tab === "account" && (
          <AccountReport report={data.account} currency={currency} locale={locale} />
        )}
        {tab === "savings" && (
          <SavingsReport report={data.savings} currency={currency} locale={locale} />
        )}
      </div>
    </div>
  );
}
