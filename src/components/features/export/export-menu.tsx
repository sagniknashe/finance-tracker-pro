"use client";

import { Download, FileSpreadsheet, FileText, Sheet } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type ExportType = "transactions" | "budgets" | "monthly";
type Format = "csv" | "xlsx" | "pdf";

const FORMATS: { value: Format; label: string; icon: typeof FileText }[] = [
  { value: "csv", label: "CSV", icon: Sheet },
  { value: "xlsx", label: "Excel", icon: FileSpreadsheet },
  { value: "pdf", label: "PDF", icon: FileText },
];

/**
 * Dropdown that downloads the current view as CSV / Excel / PDF. `params` are
 * the active filters; undefined values are omitted from the request.
 */
export function ExportMenu({
  type,
  params = {},
  size = "md",
}: {
  type: ExportType;
  params?: Record<string, string | undefined>;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function download(format: Format) {
    const qs = new URLSearchParams({ type, format });
    for (const [key, value] of Object.entries(params)) {
      if (value) qs.set(key, value);
    }
    const link = document.createElement("a");
    link.href = `/api/export?${qs.toString()}`;
    link.download = ""; // let the server's Content-Disposition name the file
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className="h-4 w-4" aria-hidden />
        Export
      </Button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-md border border-border bg-card shadow-lg",
          )}
        >
          {FORMATS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitem"
              onClick={() => download(value)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
              Export as {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
