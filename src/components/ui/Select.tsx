"use client";

import { SelectHTMLAttributes, useId } from "react";
import { cn } from "@/lib/utils";

/** Select del DS: label opcional + `<select>` nativo estilizado (accesible). */
export type Opcion = { value: string; label: string };

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  label?: string;
  options: Opcion[];
  placeholder?: string;
  error?: boolean;
  size?: "sm" | "md";
};

export function Select({
  label,
  options,
  placeholder,
  error,
  size = "md",
  id,
  className,
  ...rest
}: Props) {
  const genId = useId();
  const selId = id ?? genId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selId} className="text-[13px] font-semibold text-slate-700">
          {label}
        </label>
      )}
      <select
        id={selId}
        aria-invalid={error || undefined}
        className={cn(
          "w-full rounded-lg border bg-white px-3 text-sm text-slate-900 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-brand-border",
          size === "sm" ? "h-9" : "h-11",
          error ? "border-danger" : "border-slate-300 focus:border-brand",
          className,
        )}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
