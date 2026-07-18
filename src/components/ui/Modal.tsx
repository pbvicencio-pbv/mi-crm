"use client";

import { ReactNode, useEffect, useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Modal del DS: overlay + panel. Móvil = hoja inferior; escritorio = diálogo centrado.
 * Cierra con backdrop y Escape. Accesible (role=dialog + aria-modal; aria-describedby si hay subtítulo).
 * `size="lg"` ensancha el diálogo en escritorio (~512px) para formularios (p. ej. registrar interacción).
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = "md",
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  size?: "md" | "lg";
  children: ReactNode;
  footer?: ReactNode;
}) {
  const subtitleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-describedby={subtitle ? subtitleId : undefined}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 sm:items-center sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "flex max-h-[92vh] w-full flex-col overflow-hidden bg-white shadow-xl",
          "rounded-t-2xl sm:rounded-xl",
          size === "lg" ? "sm:max-w-lg" : "sm:max-w-md",
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold tracking-tight text-slate-900">{title}</h2>
            {subtitle && (
              <p id={subtitleId} className="mt-0.5 truncate text-[13px] text-slate-500">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-1 flex-none rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
