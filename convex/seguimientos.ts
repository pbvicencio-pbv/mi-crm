// Funciones de Convex para `seguimientos` (M4 · TAL-16 / TAL-17).
//
// Agenda del día = TRES queries paginadas independientes (Convex permite un solo
// .paginate() por ejecución de query): agendaVencidos / agendaHoy / agendaProximas.
// El cliente las consume con tres usePaginatedQuery. Autorización DENTRO de cada
// función (README/convex/clientes.ts:9). El "aviso" es la aparición aquí (pull); sin push.

import { v, ConvexError } from "convex/values";
import { paginationOptsValidator, type PaginationOptions } from "convex/server";
import { query, mutation, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireUsuario } from "./lib/auth";
import { calcularIntervalos, type Intervalos } from "./lib/fechas";
import { derivarEstadoCliente, type EstadoCliente } from "./lib/derivados";

// Presupuesto de lectura por query (holgado bajo los límites nativos de Convex:
// 32 000 documentos escaneados / 16 MiB por transacción). El enriquecimiento
// (cliente + ≤3 ventas por cliente único) va POR ENCIMA del pipeline de .paginate():
// con page ≤ MAX_PAGE_SIZE (50) y ≤4 lecturas/ítem son ≤200 lecturas extra.
const MAX_PAGE_SIZE = 50;
const MAX_ROWS_READ = 4096;
const MAX_BYTES_READ = 1 * 1024 * 1024; // 1 MiB

type Seccion = "vencidos" | "hoy" | "proximas";

type ItemAgenda = {
  seguimientoId: Id<"seguimientos">;
  clienteId: Id<"clientes">;
  nombre: string;
  motivo: string | null;
  fechaObjetivo: number;
  estadoCliente: EstadoCliente;
};

const argsAgenda = {
  paginationOpts: paginationOptsValidator,
  timeZone: v.string(),
  fechaLocal: v.string(),
  horizonteDias: v.optional(v.number()),
};

/**
 * Sanitiza los `paginationOpts` públicos: valida `numItems`, lo acota a
 * MAX_PAGE_SIZE, preserva cursor/endCursor/id e IMPONE los límites de lectura
 * server-side (el cliente no puede subirlos).
 */
function optsSeguras(paginationOpts: PaginationOptions): PaginationOptions {
  const n = paginationOpts.numItems;
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new ConvexError("paginationOpts.numItems inválido");
  }
  return {
    ...paginationOpts, // conserva cursor, endCursor, id
    numItems: Math.min(n, MAX_PAGE_SIZE),
    maximumRowsRead: MAX_ROWS_READ,
    maximumBytesRead: MAX_BYTES_READ,
  };
}

/** Aplica el rango de fecha de la sección sobre el prefijo ya fijado del índice. */
function aplicarRangoFecha(q: any, seccion: Seccion, iv: Intervalos) {
  switch (seccion) {
    case "vencidos":
      return q.lt("fecha_objetivo", iv.inicioHoy);
    case "hoy":
      return q.gte("fecha_objetivo", iv.inicioHoy).lt("fecha_objetivo", iv.finHoy);
    case "proximas":
      return q.gte("fecha_objetivo", iv.finHoy).lte("fecha_objetivo", iv.hasta);
  }
}

async function getCliente(
  ctx: QueryCtx,
  id: Id<"clientes">,
  cache: Map<string, Doc<"clientes"> | null>,
): Promise<Doc<"clientes"> | null> {
  const key = id as unknown as string;
  if (cache.has(key)) return cache.get(key)!;
  const c = await ctx.db.get(id);
  cache.set(key, c);
  return c;
}

async function consultarSeccion(ctx: QueryCtx, seccion: Seccion, args: any) {
  const intervalos = calcularIntervalos(
    { timeZone: args.timeZone, fechaLocal: args.fechaLocal, horizonteDias: args.horizonteDias },
    Date.now(),
  );
  const usuario = await requireUsuario(ctx);
  const opts = optsSeguras(args.paginationOpts);

  // El scope del vendedor se aplica DENTRO del índice, antes de paginar.
  const base =
    usuario.rol === "duena"
      ? ctx.db
          .query("seguimientos")
          .withIndex("por_estado_fecha", (q) =>
            aplicarRangoFecha(q.eq("estado", "pendiente"), seccion, intervalos),
          )
      : ctx.db
          .query("seguimientos")
          .withIndex("por_responsable_estado_fecha", (q) =>
            aplicarRangoFecha(
              q.eq("responsable", usuario._id).eq("estado", "pendiente"),
              seccion,
              intervalos,
            ),
          );

  // Vencidos ascendente (más antiguo/más urgente primero), por contrato del issue.
  const result = await base.order("asc").paginate(opts);

  // Filtra la página (cliente existe y NO archivado) y enriquece. La página puede
  // quedar vacía con isDone===false; el cliente sigue paginando por cursor.
  const cacheCliente = new Map<string, Doc<"clientes"> | null>();
  const cacheEstado = new Map<string, EstadoCliente>();
  const page: ItemAgenda[] = [];
  for (const s of result.page) {
    const cliente = await getCliente(ctx, s.cliente_id, cacheCliente);
    if (!cliente || cliente.archivado) continue;
    page.push({
      seguimientoId: s._id,
      clienteId: s.cliente_id,
      nombre: cliente.nombre,
      motivo: s.motivo ?? null,
      fechaObjetivo: s.fecha_objetivo,
      estadoCliente: await derivarEstadoCliente(ctx, s.cliente_id, cacheEstado),
    });
  }

  // Se conservan isDone / continueCursor / splitCursor / pageStatus del resultado nativo.
  return { ...result, page };
}

export const agendaVencidos = query({
  args: argsAgenda,
  handler: (ctx, args) => consultarSeccion(ctx, "vencidos", args),
});

export const agendaHoy = query({
  args: argsAgenda,
  handler: (ctx, args) => consultarSeccion(ctx, "hoy", args),
});

export const agendaProximas = query({
  args: argsAgenda,
  handler: (ctx, args) => consultarSeccion(ctx, "proximas", args),
});

/**
 * Cierra un seguimiento ("Marcar hecho"). Contrato: autoriza contra `responsable`
 * (o dueña), rechaza IDs inexistentes, es idempotente (si ya está "hecho" es no-op)
 * y atómico (OCC de Convex cubre doble clic / concurrencia).
 */
export const cerrar = mutation({
  args: { id: v.id("seguimientos") },
  returns: v.object({ ok: v.boolean(), yaCerrado: v.boolean() }),
  handler: async (ctx, { id }) => {
    const usuario = await requireUsuario(ctx);
    const seg = await ctx.db.get(id);
    if (!seg) throw new ConvexError("Seguimiento no encontrado");

    const autorizado = usuario.rol === "duena" || seg.responsable === usuario._id;
    if (!autorizado) throw new ConvexError("No autorizado para cerrar este seguimiento");

    if (seg.estado === "hecho") return { ok: true, yaCerrado: true };

    await ctx.db.patch(id, { estado: "hecho", fecha_cierre: Date.now() });
    return { ok: true, yaCerrado: false };
  },
});
