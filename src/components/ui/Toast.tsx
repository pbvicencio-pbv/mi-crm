"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/IconButton";

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
        <IconButton label="Cerrar aviso" onClick={onClose} className="-my-2 -mr-2">
          <X size={18} />
        </IconButton>
      )}
    </div>
  );
}
