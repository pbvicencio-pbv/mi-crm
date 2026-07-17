"use client";

import { InputHTMLAttributes, ReactNode, useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Input del DS: label + campo con icono opcional (prefijo/sufijo) y estado de error.
 * El sufijo se usa, por ejemplo, para el toggle de mostrar/ocultar contraseña.
 */
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> & {
  label: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  error?: boolean;
};

export function Input({ label, prefix, suffix, error, id, className, ...rest }: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-[13px] font-semibold text-slate-700">
        {label}
      </label>
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border bg-white px-3 transition-colors",
          "focus-within:ring-2 focus-within:ring-brand-border",
          error ? "border-danger" : "border-slate-300 focus-within:border-brand",
        )}
      >
        {prefix && <span className="flex-none text-slate-400">{prefix}</span>}
        <input
          id={inputId}
          aria-invalid={error || undefined}
          className={cn(
            "h-11 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none",
            className,
          )}
          {...rest}
        />
        {suffix && <span className="flex-none">{suffix}</span>}
      </div>
    </div>
  );
}
