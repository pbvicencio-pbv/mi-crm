import { Check } from "lucide-react";

/** Estado vacío motivador de la Agenda (TAL-16). */
export function AgendaVacia() {
  return (
    <div className="flex flex-col items-center rounded-lg border border-slate-200 bg-white px-7 py-12 text-center shadow-xs">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-bg text-success">
        <Check size={26} strokeWidth={2.4} aria-hidden="true" />
      </div>
      <div className="text-lg font-extrabold tracking-tight">Todo al día</div>
      <p className="mt-1.5 max-w-xs text-sm text-slate-600">
        No tienes seguimientos vencidos ni pendientes para hoy. Buen momento para prospectar.
      </p>
    </div>
  );
}
