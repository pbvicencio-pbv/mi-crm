"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Toast presentacional del DS. El padre controla su colocación y auto-cierre. */
type Tono = "success" | "danger" | "warning" | "info";

const TONOS: Record<Tono, string> = {
  success: "border-success-border",
  danger: "border-danger-border",
  warning: "border-warning-border",
  info: "border-info-border",
};

export function Toast({
  tone = "info",
  title,
  description,
  onClose,
}: {
  tone?: Tono;
  title: string;
  description?: string;
  onClose?: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-white px-4 py-3 shadow-lg",
        TONOS[tone],
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {description && <div className="mt-0.5 text-[13px] text-slate-600">{description}</div>}
      </div>
      {onClose && (
        <button
          type="button"
          aria-label="Cerrar aviso"
          onClick={onClose}
          className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
