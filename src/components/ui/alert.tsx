import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export function Alert({
  variant = "error",
  children,
  className,
}: {
  variant?: "error" | "success";
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = variant === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        variant === "error"
          ? "border-danger/30 bg-danger/10 text-danger"
          : "border-success/30 bg-success/10 text-success",
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
