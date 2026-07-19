"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, MoreVertical, Pencil, Trash2, BarChart3 } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { Select } from "@/components/ui/Select";
import { formatMoney, formatMoneyShort, formatFecha } from "@/lib/format";

export type EstadoVenta = "abierta" | "ganada" | "perdida";

export type FilaVenta = {
  _id: Id<"ventas">;
  cliente_id: Id<"clientes">;
  producto: string;
  importe: number;
  cantidad: number;
  total: number;
  estado: EstadoVenta;
  fecha: number;
  vendedor: Id<"usuarios">;
  clienteNombre: string;
  vendedorNombre: string;
};

type ChipValue = "todas" | EstadoVenta;
type Periodo = "cualquier" | "7" | "30" | "trimestre";

const ESTADO_PILL: Record<EstadoVenta, { label: string; dot: string; bg: string; fg: string }> = {
  abierta: { label: "En marcha", dot: "#F59E0B", bg: "var(--warning-bg,#fffbeb)", fg: "var(--warning-fg,#b45309)" },
  ganada: { label: "Ganada", dot: "#059669", bg: "var(--success-bg,#ecfdf5)", fg: "var(--success-fg,#047857)" },
  perdida: { label: "Perdida", dot: "#DC2626", bg: "var(--danger-bg,#fef2f2)", fg: "var(--danger-fg,#b91c1c)" },
};
const CHIPS: { value: ChipValue; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "abierta", label: "En marcha" },
  { value: "ganada", label: "Ganadas" },
  { value: "perdida", label: "Perdidas" },
];
const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "cualquier", label: "Cualquier fecha" },
  { value: "7", label: "Últimos 7 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "trimestre", label: "Este trimestre" },
];

/** Límite inferior (ms) del periodo elegido; `null` = sin límite. "Este trimestre" = trimestre natural. */
function desdePeriodo(periodo: Periodo, now: number): number | null {
  const dia = 86_400_000;
  if (periodo === "7") return now - 7 * dia;
  if (periodo === "30") return now - 30 * dia;
  if (periodo === "trimestre") {
    const d = new Date(now);
    return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1).getTime();
  }
  return null;
}

/**
 * Pantalla Ventas (P9 · vista pura, testeable). KPIs (En marcha / Ganado) y contadores de chips
 * reflejan los filtros Cliente + Periodo (D4); el chip de estado acota el listado. El ⋮ (Editar/
 * Eliminar) se habilita solo si el usuario puede operar la venta (D1: dueña o vendedor dueño).
 */
export function VentasListaView({
  ventas,
  yo,
  now = Date.now(),
  onAnadir,
  onEditar,
  onEliminar,
}: {
  ventas: FilaVenta[];
  yo: { _id: Id<"usuarios">; rol: "duena" | "vendedor" };
  now?: number;
  onAnadir: () => void;
  onEditar: (venta: FilaVenta) => void;
  onEliminar: (venta: FilaVenta) => void;
}) {
  const [chip, setChip] = useState<ChipValue>("todas");
  const [clienteId, setClienteId] = useState<string>("");
  const [periodo, setPeriodo] = useState<Periodo>("cualquier");

  // Opciones de cliente = únicos presentes en las ventas.
  const clientesOpts = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of ventas) m.set(v.cliente_id, v.clienteNombre);
    return [...m.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [ventas]);

  // Working set = Cliente + Periodo (los KPIs y contadores se calculan sobre esto · D4).
  const working = useMemo(() => {
    const desde = desdePeriodo(periodo, now);
    return ventas.filter(
      (v) => (!clienteId || v.cliente_id === clienteId) && (desde === null || v.fecha >= desde),
    );
  }, [ventas, clienteId, periodo, now]);

  const kpis = useMemo(() => {
    const acc = { abierta: { n: 0, s: 0 }, ganada: { n: 0, s: 0 } };
    for (const v of working) {
      if (v.estado === "abierta") { acc.abierta.n++; acc.abierta.s += v.total; }
      else if (v.estado === "ganada") { acc.ganada.n++; acc.ganada.s += v.total; }
    }
    return acc;
  }, [working]);

  const conteo = useMemo(
    () => ({
      todas: working.length,
      abierta: working.filter((v) => v.estado === "abierta").length,
      ganada: working.filter((v) => v.estado === "ganada").length,
      perdida: working.filter((v) => v.estado === "perdida").length,
    }),
    [working],
  );

  const visibles = chip === "todas" ? working : working.filter((v) => v.estado === chip);
  const vacioTotal = ventas.length === 0;

  return (
    <section className="animate-in flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Ventas</h1>
          <p className="mt-1 text-sm text-slate-500">Oportunidades y ventas cerradas de tu equipo.</p>
        </div>
        <button
          type="button"
          onClick={onAnadir}
          className="inline-flex flex-none items-center gap-2 rounded-md bg-brand px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          <Plus size={16} /> Añadir venta
        </button>
      </div>

      {vacioTotal ? (
        <div className="mx-auto mt-1 flex max-w-md flex-col items-center rounded-lg border border-slate-200 bg-white px-7 py-12 text-center shadow-xs">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <BarChart3 size={24} />
          </span>
          <div className="text-lg font-extrabold tracking-tight">Aún no hay ventas</div>
          <p className="mt-1.5 max-w-xs text-sm text-slate-600">
            Registra tu primera venta u oportunidad para ver aquí tus totales.
          </p>
          <button
            type="button"
            onClick={onAnadir}
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            <Plus size={16} /> Añadir la primera venta
          </button>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3.5">
            <KpiCard label="En marcha" color="#F59E0B" n={kpis.abierta.n} importe={kpis.abierta.s} />
            <KpiCard label="Ganado" color="#059669" n={kpis.ganada.n} importe={kpis.ganada.s} />
          </div>

          {/* Filtros */}
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2">
              {CHIPS.map((c) => {
                const sel = chip === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={sel}
                    onClick={() => setChip(c.value)}
                    className={
                      "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors " +
                      (sel
                        ? "border-brand bg-brand text-white"
                        : "border-slate-300 bg-white text-slate-600 hover:border-slate-400")
                    }
                  >
                    {c.label}
                    <span className={"mono text-[11px] " + (sel ? "text-white/80" : "text-slate-400")}>
                      {conteo[c.value]}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Select
                label="Cliente"
                size="sm"
                options={[{ value: "", label: "Todos" }, ...clientesOpts]}
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
              />
              <Select
                label="Periodo"
                size="sm"
                options={PERIODOS}
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value as Periodo)}
              />
            </div>
          </div>

          {/* Listado */}
          {visibles.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-9 text-center shadow-xs">
              <div className="text-base font-extrabold">Sin ventas que coincidan</div>
              <p className="mt-1 text-sm text-slate-600">Prueba con otro estado, cliente o periodo.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
              {visibles.map((v) => (
                <VentaRow
                  key={v._id}
                  venta={v}
                  now={now}
                  puedeOperar={yo.rol === "duena" || v.vendedor === yo._id}
                  onEditar={() => onEditar(v)}
                  onEliminar={() => onEliminar(v)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function KpiCard({ label, color, n, importe }: { label: string; color: string; n: number; importe: number }) {
  return (
    <div role="group" aria-label={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden="true" />
        <span className="text-[13px] font-semibold text-slate-600">{label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="mono text-2xl font-extrabold" style={{ color }}>
          {n}
        </span>
        <span className="mono text-sm font-semibold text-slate-500">{formatMoneyShort(importe)}</span>
      </div>
    </div>
  );
}

/** Fila de venta: stretched-link → ficha del cliente (D2) + ⋮ Editar/Eliminar (gateado por D1). */
function VentaRow({
  venta: v,
  now,
  puedeOperar,
  onEditar,
  onEliminar,
}: {
  venta: FilaVenta;
  now: number;
  puedeOperar: boolean;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pill = ESTADO_PILL[v.estado];

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  return (
    <article className="relative flex items-center gap-3 border-b border-slate-100 p-3.5 transition-colors last:border-b-0 hover:bg-slate-50">
      <div className="min-w-0 flex-1">
        <Link
          href={`/clientes/${v.cliente_id}`}
          className="rounded outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-brand-border"
        >
          <span className="block truncate text-sm font-bold text-slate-900">{v.producto}</span>
        </Link>
        <div className="truncate text-xs text-slate-500">Cliente: {v.clienteNombre}</div>
        <div className="mono mt-0.5 truncate text-xs text-slate-400">
          {v.vendedorNombre} · {formatFecha(v.fecha)}
        </div>
      </div>

      <div className="flex flex-none flex-col items-end gap-1.5">
        <span className="mono text-sm font-bold text-slate-900">{formatMoney(v.total)}</span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ background: pill.bg, color: pill.fg }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: pill.dot }} aria-hidden="true" />
          {pill.label}
        </span>
      </div>

      {/* Menú ⋮ — hermano por encima del enlace estirado (z-10). */}
      <div ref={ref} className="relative z-10 flex-none">
        <button
          type="button"
          aria-label={`Acciones de ${v.producto}`}
          aria-haspopup="menu"
          aria-expanded={menu}
          onClick={() => setMenu((m) => !m)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <MoreVertical size={18} />
        </button>
        {menu && (
          <div
            role="menu"
            className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              disabled={!puedeOperar}
              onClick={() => {
                setMenu(false);
                onEditar();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
            >
              <Pencil size={15} /> Editar
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={!puedeOperar}
              onClick={() => {
                setMenu(false);
                onEliminar();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-danger-bg disabled:pointer-events-none disabled:opacity-50"
            >
              <Trash2 size={15} /> Eliminar
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
