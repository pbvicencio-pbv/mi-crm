import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Badge del DS (variante soft + dot opcional). Tono = significado. */
export type BadgeTono = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const TONOS: Record<BadgeTono, { wrap: string; dot: string }> = {
  neutral: { wrap: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  brand: { wrap: "bg-brand-subtle text-brand", dot: "bg-brand" },
  success: { wrap: "bg-success-bg text-success-fg", dot: "bg-success" },
  warning: { wrap: "bg-warning-bg text-warning-fg", dot: "bg-warning" },
  danger: { wrap: "bg-danger-bg text-danger-fg", dot: "bg-danger" },
  info: { wrap: "bg-info-bg text-info-fg", dot: "bg-info" },
};

export function Badge({
  tone = "neutral",
  dot = false,
  children,
  className,
}: {
  tone?: BadgeTono;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const t = TONOS[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
        t.wrap,
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} aria-hidden="true" />}
      {children}
    </span>
  );
}
