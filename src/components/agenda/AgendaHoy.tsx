"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { TareaCard, type ItemAgenda } from "./TareaCard";
import { AgendaVacia } from "./AgendaVacia";
import { Toast } from "@/components/ui/Toast";
import { zonaHoraria, fechaLocal, msHastaProximaMedianoche } from "@/lib/agenda";
import { cn } from "@/lib/utils";

const INITIAL = 20;
const AUTO_MAX = 5; // páginas vacías (solo archivados) auto-avanzadas antes de exigir "Mostrar más"

type DatosSeccion = {
  results: ItemAgenda[];
  status: string;
  loadMore: (n: number) => void;
};

export function AgendaHoy() {
  const usuario = useQuery(api.usuarios.actual);
  const [now, setNow] = useState(() => Date.now());
  const tz = useMemo(() => zonaHoraria(), []);
  const hoy = useMemo(() => fechaLocal(now, tz), [now, tz]);

  const cerrarMut = useMutation(api.seguimientos.cerrar);
  const [cerrando, setCerrando] = useState<Record<string, boolean>>({});
  const cerrandoRef = useRef<Set<string>>(new Set()); // guard síncrono anti doble-disparo
  const [toast, setToast] = useState<{ tone: "success" | "danger"; msg: string } | null>(null);

  // Reprogramar al cruzar la medianoche local.
  useEffect(() => {
    const t = setTimeout(() => setNow(Date.now()), msHastaProximaMedianoche(now, tz));
    return () => clearTimeout(t);
  }, [now, tz]);
  // Recomputar al volver a la pestaña.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const hayUsuario = !!usuario;
  const args = useMemo(
    () => (hayUsuario ? { timeZone: tz, fechaLocal: hoy } : "skip"),
    [hayUsuario, tz, hoy],
  );
  const claveReset = `${hayUsuario ? usuario!._id : "-"}|${tz}|${hoy}`;

  const vencidos = useSeccion(api.seguimientos.agendaVencidos, args, claveReset);
  const hoyQ = useSeccion(api.seguimientos.agendaHoy, args, claveReset);
  const proximas = useSeccion(api.seguimientos.agendaProximas, args, claveReset);

  const onCerrar = useCallback(
    async (id: string) => {
      if (cerrandoRef.current.has(id)) return; // ignora reentradas (doble clic, etc.)
      cerrandoRef.current.add(id);
      setCerrando((c) => ({ ...c, [id]: true }));
      try {
        await cerrarMut({ id: id as Id<"seguimientos"> });
        setToast({ tone: "success", msg: "Seguimiento completado" });
      } catch {
        setToast({ tone: "danger", msg: "No se pudo marcar como hecho. Reintenta." });
      } finally {
        cerrandoRef.current.delete(id);
        setCerrando((c) => {
          const n = { ...c };
          delete n[id];
          return n;
        });
      }
    },
    [cerrarMut],
  );

  if (usuario === undefined) return <AgendaSkeleton />;
  if (usuario === null) return <NoAutenticado />;

  const secciones = [vencidos, hoyQ, proximas];
  const cargandoInicial = secciones.some((s) => s.status === "LoadingFirstPage");
  // "Todo al día" SOLO cuando las 3 secciones están agotadas y sin ítems válidos.
  const todoVacio = secciones.every((s) => s.status === "Exhausted" && s.results.length === 0);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-[22px] font-extrabold tracking-tight">
          {saludo(now)}, {usuario.nombre.split(" ")[0]}
        </h1>
        <p className="mono mt-0.5 text-[13px] text-slate-600">{fechaLarga(now)}</p>
      </header>

      {cargandoInicial ? (
        <AgendaSkeleton soloListas />
      ) : todoVacio ? (
        <AgendaVacia />
      ) : (
        <>
          <div className="flex flex-col gap-5 md:flex-row md:items-start">
            <Seccion
              titulo="Vencidos"
              tono="danger"
              seccion={vencidos}
              now={now}
              cerrando={cerrando}
              onCerrar={onCerrar}
              vencido
            />
            <Seccion
              titulo="Hoy"
              tono="brand"
              seccion={hoyQ}
              now={now}
              cerrando={cerrando}
              onCerrar={onCerrar}
            />
          </div>
          <div className="mt-5">
            <Seccion
              titulo="Próximas"
              tono="neutral"
              seccion={proximas}
              now={now}
              cerrando={cerrando}
              onCerrar={onCerrar}
            />
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-20 right-4 z-40 w-[calc(100%-2rem)] max-w-sm md:bottom-6 md:right-6">
          <Toast
            tone={toast.tone}
            title={toast.tone === "success" ? "Listo" : "Error"}
            description={toast.msg}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}

/** usePaginatedQuery + auto-avance de páginas vacías (solo-archivados) con tope. */
function useSeccion(query: any, args: any, claveReset: string): DatosSeccion {
  const p = usePaginatedQuery(query, args, { initialNumItems: INITIAL });
  const [autos, setAutos] = useState(0);

  useEffect(() => {
    setAutos(0);
  }, [claveReset]);

  useEffect(() => {
    if (p.status === "CanLoadMore" && p.results.length === 0 && autos < AUTO_MAX) {
      setAutos((a) => a + 1);
      p.loadMore(INITIAL);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.status, p.results.length, autos]);

  return { results: p.results as ItemAgenda[], status: p.status, loadMore: p.loadMore };
}

function Seccion({
  titulo,
  tono,
  seccion,
  now,
  cerrando,
  onCerrar,
  vencido = false,
}: {
  titulo: string;
  tono: "danger" | "brand" | "neutral";
  seccion: DatosSeccion;
  now: number;
  cerrando: Record<string, boolean>;
  onCerrar: (id: string) => void;
  vencido?: boolean;
}) {
  const { results, status, loadMore } = seccion;

  // Oculta la sección solo si está vacía y definitivamente agotada (o en carga inicial).
  if (results.length === 0 && (status === "Exhausted" || status === "LoadingFirstPage")) {
    return null;
  }

  const canMore = status === "CanLoadMore";
  const loadingMore = status === "LoadingMore";

  return (
    <section className="min-w-0 flex-1">
      <div className="mb-2.5 flex items-center gap-2">
        <span
          className={cn(
            "text-[11px] font-bold uppercase tracking-[0.08em]",
            tono === "danger" ? "text-danger" : "text-slate-500",
          )}
        >
          {titulo}
        </span>
        <span
          className={cn(
            "mono rounded-full px-1.5 py-0.5 text-[11px] font-bold",
            tono === "danger" ? "bg-danger-bg text-danger" : "bg-brand-subtle text-brand",
          )}
        >
          {results.length}
          {canMore ? "+" : ""}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {results.map((it) => (
          <TareaCard
            key={it.seguimientoId}
            item={it}
            now={now}
            vencido={vencido}
            cerrando={!!cerrando[it.seguimientoId]}
            onCerrar={() => onCerrar(it.seguimientoId)}
          />
        ))}
      </div>

      {(canMore || loadingMore) && (
        <button
          type="button"
          onClick={() => loadMore(INITIAL)}
          disabled={loadingMore}
          className="mt-3 w-full rounded-md border border-slate-200 bg-white py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {loadingMore ? "Cargando…" : "Mostrar más"}
        </button>
      )}
    </section>
  );
}

function saludo(now: number): string {
  const h = new Date(now).getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function fechaLarga(now: number): string {
  const s = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(now));
  return `Hoy, ${s}`;
}

function NoAutenticado() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-xs">
      <div className="text-lg font-extrabold tracking-tight">No autenticado</div>
      <p className="mt-1.5 text-sm text-slate-600">Inicia sesión para ver tu agenda del día.</p>
    </div>
  );
}

function AgendaSkeleton({ soloListas = false }: { soloListas?: boolean }) {
  return (
    <div className="animate-pulse">
      {!soloListas && (
        <div className="mb-6">
          <div className="h-6 w-56 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-36 rounded bg-slate-100" />
        </div>
      )}
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[92px] rounded-lg border border-slate-200 bg-white shadow-xs" />
        ))}
      </div>
    </div>
  );
}
