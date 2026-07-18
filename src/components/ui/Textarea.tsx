"use client";

import { TextareaHTMLAttributes, useId } from "react";
import { cn } from "@/lib/utils";

/** Textarea del DS: label + área de texto estilizada (coherente con Input). */
type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: boolean;
};

export function Textarea({ label, error, id, className, rows = 3, ...rest }: Props) {
  const generatedId = useId();
  const areaId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={areaId} className="text-[13px] font-semibold text-slate-700">
        {label}
      </label>
      <textarea
        id={areaId}
        rows={rows}
        aria-invalid={error || undefined}
        className={cn(
          "w-full resize-y rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-brand-border",
          error ? "border-danger" : "border-slate-300 focus:border-brand",
          className,
        )}
        {...rest}
      />
    </div>
  );
}
