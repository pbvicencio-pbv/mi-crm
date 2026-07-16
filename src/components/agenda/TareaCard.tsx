import Link from "next/link";
import { Check, Clock } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ESTADO_CLIENTE_UI } from "@/lib/agenda";
import { formatAgendaFecha } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ItemAgenda = {
  seguimientoId: string;
  clienteId: string;
  nombre: string;
  motivo: string | null;
  fechaObjetivo: number;
  estadoCliente: string;
};

/**
 * Tarjeta de seguimiento (TAL-16). Patrón "stretched-link" accesible: el nombre es
 * un enlace cuyo overlay (::after) cubre la tarjeta y abre la Ficha; el botón
 * "Marcar hecho" es un hermano por encima (z-10), no anidado en el enlace.
 */
export function TareaCard({
  item,
  now,
  vencido = false,
  cerrando,
  onCerrar,
}: {
  item: ItemAgenda;
  now: number;
  vencido?: boolean;
  cerrando: boolean;
  onCerrar: () => void;
}) {
  const estado = ESTADO_CLIENTE_UI[item.estadoCliente] ?? {
    label: item.estadoCliente,
    tone: "neutral" as const,
  };

  return (
    <article
      className={cn(
        "relative flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs transition hover:border-slate-300 hover:shadow-md",
        vencido && "border-l-[3px] border-l-danger",
      )}
    >
      <Avatar name={item.nombre} size="md" />

      <div className="min-w-0 flex-1">
        <Link
          href={`/clientes/${item.clienteId}`}
          className="rounded outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-brand-border"
        >
          <span className="block truncate text-sm font-bold text-slate-900">{item.nombre}</span>
        </Link>
        {item.motivo && (
          <p className="mt-0.5 truncate text-[13px] text-slate-600">{item.motivo}</p>
        )}
        <div className={cn("mt-2 flex items-center gap-1.5", vencido ? "text-danger" : "text-slate-400")}>
          <Clock size={14} aria-hidden="true" />
          <span className="mono text-xs font-semibold">{formatAgendaFecha(item.fechaObjetivo, now)}</span>
        </div>
      </div>

      {/* pointer-events-none deja pasar los clics del área (incl. el badge) al enlace
          estirado; solo el botón reactiva el puntero. */}
      <div className="pointer-events-none relative z-10 flex shrink-0 flex-col items-end gap-2.5">
        <Badge tone={estado.tone} dot>
          {estado.label}
        </Badge>
        <button
          type="button"
          onClick={onCerrar}
          disabled={cerrando}
          aria-label={`Marcar hecho el seguimiento de ${item.nombre}`}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border-2 border-slate-300 text-slate-400 transition hover:border-brand hover:bg-brand-subtle hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-border disabled:opacity-40"
        >
          <Check size={20} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
