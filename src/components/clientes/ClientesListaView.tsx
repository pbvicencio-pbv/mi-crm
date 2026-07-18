"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X, Plus, Users } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, type BadgeTono } from "@/components/ui/Badge";

type Canal = "whatsapp" | "instagram" | "telefono" | "email";
type Prioridad = "alta" | "media" | "baja";
type Estado = "nuevo_lead" | "en_negociacion" | "ganado" | "perdido";

export type ClienteFila = {
  _id: Id<"clientes">;
  nombre: string;
  telefono?: string;
  canal?: Canal;
  prioridad: Prioridad;
  estado: Estado;
};

const CANAL_LABEL: Record<Canal, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  telefono: "Teléfono",
  email: "Email",
};
const ESTADO: Record<Estado, { label: string; tono: BadgeTono }> = {
  nuevo_lead: { label: "Nuevo lead", tono: "neutral" },
  en_negociacion: { label: "En negociación", tono: "warning" },
  ganado: { label: "Ganado", tono: "success" },
  perdido: { label: "Perdido", tono: "danger" },
};
const PRIORIDAD: Record<Prioridad, { label: string; tono: BadgeTono; rank: number }> = {
  alta: { label: "Alta", tono: "danger", rank: 0 },
  media: { label: "Media", tono: "warning", rank: 1 },
  baja: { label: "Baja", tono: "neutral", rank: 2 },
};
const FILTROS: { value: "todas" | Prioridad; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baja", label: "Baja" },
];

export function ClientesListaView({ clientes }: { clientes: ClienteFila[] }) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todas" | Prioridad>("todas");

  const visibles = useMemo(() => {
    const term = q.trim().toLowerCase();
    return clientes
      .filter((c) => {
        const coincide =
          !term ||
          c.nombre.toLowerCase().includes(term) ||
          (c.telefono ?? "").toLowerCase().includes(term);
        const enFiltro = filtro === "todas" || c.prioridad === filtro;
        return coincide && enFiltro;
      })
      .sort(
        (a, b) =>
          PRIORIDAD[a.prioridad].rank - PRIORIDAD[b.prioridad].rank ||
          a.nombre.localeCompare(b.nombre),
      );
  }, [clientes, q, filtro]);

  const vacioTotal = clientes.length === 0;
  const buscando = q.trim() !== "" || filtro !== "todas";

  return (
    <section className="animate-in flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-slate-500">Busca, filtra y abre la ficha de un cliente.</p>
        </div>
        <Link
          href="/clientes/nuevo"
          className="inline-flex flex-none items-center gap-2 rounded-md bg-brand px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          <Plus size={16} /> Nuevo cliente
        </Link>
      </div>

      {/* Buscador + filtros (sticky) — siempre visibles (fiel al diseño). */}
      <div className="sticky top-0 z-10 -mx-1 flex flex-col gap-2.5 bg-slate-50 px-1 pb-1 pt-0.5">
        <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 shadow-xs focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-border">
          <Search size={16} className="flex-none text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o teléfono"
            aria-label="Buscar clientes"
            className="h-11 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {q && (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              onClick={() => setQ("")}
              className="flex-none rounded p-1 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => {
            const sel = filtro === f.value;
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={sel}
                onClick={() => setFiltro(f.value)}
                className={
                  "min-h-8 rounded-full border px-3.5 text-[13px] font-semibold transition-colors " +
                  (sel
                    ? "border-brand bg-brand-subtle text-brand"
                    : "border-slate-300 bg-white text-slate-600 hover:border-slate-400")
                }
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {vacioTotal ? (
        <div className="mx-auto mt-1 flex max-w-md flex-col items-center rounded-lg border border-slate-200 bg-white px-7 py-12 text-center shadow-xs">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Users size={24} />
          </span>
          <div className="text-lg font-extrabold tracking-tight">Aún no tienes clientes</div>
          <p className="mt-1.5 max-w-xs text-sm text-slate-600">
            Añade tu primer cliente para empezar a registrar seguimientos y ventas.
          </p>
          <Link
            href="/clientes/nuevo"
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            <Plus size={16} /> Añadir el primer cliente
          </Link>
        </div>
      ) : (
        <>
          <p className="text-[13px] text-slate-500">
            <span className="mono font-semibold text-slate-900">{visibles.length}</span>{" "}
            {buscando ? "resultado" : "cliente"}
            {visibles.length === 1 ? "" : "s"}
          </p>

          {visibles.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-9 text-center shadow-xs">
              <div className="text-base font-extrabold">Sin clientes que coincidan</div>
              <p className="mt-1 text-sm text-slate-600">Prueba con otra prioridad o cambia la búsqueda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
              {visibles.map((c) => (
                <Link
                  key={c._id}
                  href={`/clientes/${c._id}`}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs transition-shadow hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={c.nombre} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-900">{c.nombre}</div>
                      <div className="mono truncate text-xs text-slate-500">{c.telefono ?? "—"}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.canal && (
                      <Badge variant="outline" tone="neutral">
                        {CANAL_LABEL[c.canal]}
                      </Badge>
                    )}
                    <Badge tone={ESTADO[c.estado].tono} dot>
                      {ESTADO[c.estado].label}
                    </Badge>
                    <Badge tone={PRIORIDAD[c.prioridad].tono}>{PRIORIDAD[c.prioridad].label}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
