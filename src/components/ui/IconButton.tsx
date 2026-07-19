import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Tono del icon-button: neutro (acciones normales) o danger (destructivas). */
type Tono = "neutral" | "danger";

const TONOS: Record<Tono, string> = {
  neutral: "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
  danger: "text-danger hover:bg-danger-bg",
};

/**
 * Botón icon-only del DS con área táctil **≥44×44** (TAL-19 · pulido móvil). `label` es obligatorio
 * y va a `aria-label` (accesibilidad). El tamaño 44 garantiza un objetivo táctil cómodo en móvil sin
 * depender del padding del icono. Para controles icon-only que son enlaces, usar 44×44 en el `<Link>`.
 */
export function IconButton({
  label,
  tono = "neutral",
  className,
  children,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  label: string;
  tono?: Tono;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "flex h-11 w-11 flex-none items-center justify-center rounded-md transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border",
        "disabled:pointer-events-none disabled:opacity-40",
        TONOS[tono],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
