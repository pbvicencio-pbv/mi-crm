import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Button del DS: un solo primary por sección; verbos en sentence case. */
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTES: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover active:bg-brand-active",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100",
  danger: "bg-danger text-white hover:bg-danger-fg",
};

const TAMANOS: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  iconLeft,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTES[variant],
        TAMANOS[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {iconLeft}
      {children}
    </button>
  );
}
