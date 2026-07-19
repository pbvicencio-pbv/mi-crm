// Funciones de Convex para `clientes` (M3 · TAL-11 / TAL-34 / TAL-35 …).
//
// Esta pasada (conjunto M3.1): alta/edición de cliente + prioridad.
//  - crearCliente / actualizarCliente: escritura con TODOS los campos del diseño (P5).
//  - obtener: cliente crudo para precargar la edición (la ficha 360 con derivados llega en TAL-13).
//
// Autorización DENTRO de cada función (no RLS): `requireUsuario` (cualquier sesión válida crea/edita
// en el MVP). El `propietario` se VALIDA en el servidor (existe y activo) — el select de UI no basta.
// Baja = archivar (`archivado=true`), NO borrado (TAL-59). Estado/valor del cliente son DERIVADOS
// (no se guardan): se calculan en queries. `registrado_por` y `_creationTime` no se editan nunca.

import { ConvexError, v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireUsuario } from "./lib/auth";
import { derivarEstadoCliente, derivarValorCliente, type EstadoCliente } from "./lib/derivados";
import { tipoInteraccionValidator, canalInteraccionValidator } from "./lib/validadores";

const canalValidator = v.union(
  v.literal("whatsapp"),
  v.literal("instagram"),
  v.literal("telefono"),
  v.literal("email"),
);
const origenValidator = v.union(
  v.literal("recomendacion"),
  v.literal("campana"),
  v.literal("sitio_web"),
  v.literal("evento"),
  v.literal("otro"),
);
const prioridadValidator = v.union(v.literal("alta"), v.literal("media"), v.literal("baja"));
const estadoValidator = v.union(
  v.literal("nuevo_lead"),
  v.literal("en_negociacion"),
  v.literal("ganado"),
  v.literal("perdido"),
);

// Topes de longitud por campo (server-side; el cliente no puede saltárselos). Se validan TRAS trim.
const LIM = { nombre: 120, telefono: 40, email: 200, empresa: 120, cargo: 80, ciudad: 80, notas: 2000 } as const;

/** Opcional: recorta; vacío → `undefined` (en `patch`, limpia el campo); excede `max` → error. */
function opcional(valor: string | undefined, etiqueta: string, max: number): string | undefined {
  const t = valor?.trim();
  if (!t) return undefined;
  if (t.length > max) throw new ConvexError(`${etiqueta} no puede superar ${max} caracteres`);
  return t;
}

/** Nombre (obligatorio): recorta; vacío → error; excede → error. */
function nombreValido(valor: string): string {
  const t = valor.trim();
  if (!t) throw new ConvexError("El nombre es obligatorio");
  if (t.length > LIM.nombre) throw new ConvexError(`El nombre no puede superar ${LIM.nombre} caracteres`);
  return t;
}

/** Email opcional: recorta; vacío → `undefined`; sanidad básica (no RFC completo) + tope. */
function emailValido(valor: string | undefined): string | undefined {
  const t = valor?.trim();
  if (!t) return undefined;
  if (t.length > LIM.email) throw new ConvexError(`El email no puede superar ${LIM.email} caracteres`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) throw new ConvexError("El email no es válido");
  return t;
}

/**
 * Resuelve y VALIDA el propietario en el servidor (nunca confiar en el select del cliente):
 *  - si viene informado → debe existir y estar activo (`activo !== false`), o se rechaza.
 *  - si no viene → default al usuario actual.
 */
async function resolverPropietario(
  ctx: MutationCtx,
  propietario: Id<"usuarios"> | undefined,
  yoId: Id<"usuarios">,
): Promise<Id<"usuarios">> {
  if (propietario === undefined) return yoId;
  const u = await ctx.db.get(propietario);
  if (!u || u.activo === false) throw new ConvexError("El propietario no es un usuario válido");
  return propietario;
}

// ---------- Alta ----------

/** Alta de cliente (P5). Cualquier sesión válida. Default prioridad=media, propietario=yo. */
export const crearCliente = mutation({
  args: {
    nombre: v.string(),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    empresa: v.optional(v.string()),
    cargo: v.optional(v.string()),
    ciudad: v.optional(v.string()),
    canal: v.optional(canalValidator),
    origen: v.optional(origenValidator),
    notas: v.optional(v.string()),
    prioridad: v.optional(prioridadValidator),
    propietario: v.optional(v.id("usuarios")),
  },
  returns: v.id("clientes"),
  handler: async (ctx, args) => {
    const yo = await requireUsuario(ctx);
    const nombre = nombreValido(args.nombre);
    const propietario = await resolverPropietario(ctx, args.propietario, yo._id);
    return await ctx.db.insert("clientes", {
      nombre,
      telefono: opcional(args.telefono, "El teléfono", LIM.telefono),
      email: emailValido(args.email),
      empresa: opcional(args.empresa, "La empresa", LIM.empresa),
      cargo: opcional(args.cargo, "El cargo", LIM.cargo),
      ciudad: opcional(args.ciudad, "La ciudad", LIM.ciudad),
      canal: args.canal,
      origen: args.origen,
      notas: opcional(args.notas, "Las notas", LIM.notas),
      prioridad: args.prioridad ?? "media",
      propietario,
      registrado_por: yo._id,
      archivado: false,
    });
  },
});

// ---------- Edición ----------

/**
 * Edición de cliente (P5). Rechaza si no existe o está archivado. `propietario` es requerido
 * (el form siempre lo envía) y se valida activo. NO toca `archivado`, `registrado_por`,
 * `_creationTime` ni derivados.
 */
export const actualizarCliente = mutation({
  args: {
    id: v.id("clientes"),
    nombre: v.string(),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    empresa: v.optional(v.string()),
    cargo: v.optional(v.string()),
    ciudad: v.optional(v.string()),
    canal: v.optional(canalValidator),
    origen: v.optional(origenValidator),
    notas: v.optional(v.string()),
    prioridad: prioridadValidator,
    propietario: v.id("usuarios"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const yo = await requireUsuario(ctx);
    const target = await ctx.db.get(args.id);
    if (!target || target.archivado === true) throw new ConvexError("Cliente no encontrado");
    const nombre = nombreValido(args.nombre);
    const propietario = await resolverPropietario(ctx, args.propietario, yo._id);
    await ctx.db.patch(args.id, {
      nombre,
      telefono: opcional(args.telefono, "El teléfono", LIM.telefono),
      email: emailValido(args.email),
      empresa: opcional(args.empresa, "La empresa", LIM.empresa),
      cargo: opcional(args.cargo, "El cargo", LIM.cargo),
      ciudad: opcional(args.ciudad, "La ciudad", LIM.ciudad),
      canal: args.canal,
      origen: args.origen,
      notas: opcional(args.notas, "Las notas", LIM.notas),
      prioridad: args.prioridad,
      propietario,
    });
    return null;
  },
});

// ---------- Archivar (soft-delete · TAL-59) ----------

/**
 * Archiva un cliente (baja lógica). Cualquier sesión válida (`requireUsuario`), igual que
 * crear/actualizar. Idempotente al estilo de `seguimientos.cerrar`: rechaza IDs inexistentes y,
 * si ya está archivado, es no-op (`yaArchivado:true`). Corto y acotado (get → patch): NO escanea
 * la tabla, para no ampliar el read-set (OCC). SIN cascada: no toca ventas/interacciones/
 * seguimientos del cliente — las lecturas ya ocultan todo lo suyo (`listar`/`obtener`/`ficha`
 * devuelven vacío/null al estar archivado). Restaurar (desarchivar) es mejora futura del issue.
 */
export const archivarCliente = mutation({
  args: { id: v.id("clientes") },
  returns: v.object({ ok: v.boolean(), yaArchivado: v.boolean() }),
  handler: async (ctx, { id }) => {
    await requireUsuario(ctx);
    const cliente = await ctx.db.get(id);
    if (!cliente) throw new ConvexError("Cliente no encontrado");
    if (cliente.archivado === true) return { ok: true, yaArchivado: true };
    await ctx.db.patch(id, { archivado: true });
    return { ok: true, yaArchivado: false };
  },
});

// ---------- Lectura para edición ----------

const clienteParaEditar = v.object({
  _id: v.id("clientes"),
  nombre: v.string(),
  telefono: v.optional(v.string()),
  email: v.optional(v.string()),
  empresa: v.optional(v.string()),
  cargo: v.optional(v.string()),
  ciudad: v.optional(v.string()),
  canal: v.optional(canalValidator),
  origen: v.optional(origenValidator),
  notas: v.optional(v.string()),
  prioridad: prioridadValidator,
  propietario: v.id("usuarios"),
});

/** Cliente crudo para precargar el formulario de edición. `null` si no existe o está archivado. */
export const obtener = query({
  args: { id: v.id("clientes") },
  returns: v.union(v.null(), clienteParaEditar),
  handler: async (ctx, { id }) => {
    await requireUsuario(ctx);
    const c = await ctx.db.get(id);
    if (!c || c.archivado === true) return null;
    return {
      _id: c._id,
      nombre: c.nombre,
      telefono: c.telefono,
      email: c.email,
      empresa: c.empresa,
      cargo: c.cargo,
      ciudad: c.ciudad,
      canal: c.canal,
      origen: c.origen,
      notas: c.notas,
      prioridad: c.prioridad,
      propietario: c.propietario,
    };
  },
});

// ---------- Listado (P3 · TAL-12/TAL-36) ----------

const filaCliente = v.object({
  _id: v.id("clientes"),
  nombre: v.string(),
  telefono: v.optional(v.string()),
  canal: v.optional(canalValidator),
  prioridad: prioridadValidator,
  estado: estadoValidator,
});

/**
 * Lista de clientes activos (P3). Cualquier sesión válida. Acotado a 200 (`por_archivado=false`,
 * excluye archivados). Devuelve el `estado` DERIVADO por cliente (lecturas constantes, cache por
 * ejecución). La búsqueda/orden/filtro por prioridad se resuelven en cliente (dataset pequeño).
 */
export const listar = query({
  args: {},
  returns: v.array(filaCliente),
  handler: async (ctx) => {
    await requireUsuario(ctx);
    const activos = await ctx.db
      .query("clientes")
      .withIndex("por_archivado", (q) => q.eq("archivado", false))
      .take(200);
    const cache = new Map<string, EstadoCliente>();
    const filas = [];
    for (const c of activos) {
      const estado = await derivarEstadoCliente(ctx, c._id, cache);
      filas.push({
        _id: c._id,
        nombre: c.nombre,
        telefono: c.telefono,
        canal: c.canal,
        prioridad: c.prioridad,
        estado,
      });
    }
    return filas;
  },
});

/**
 * Opciones de cliente activo `{_id, nombre}` para selectores (p. ej. "Añadir venta" en /ventas · TAL-50).
 * Cualquier sesión válida. Acotada; NO calcula derivados (a diferencia de `listar`), para no pagar el
 * coste del estado en un selector.
 */
export const opcionesActivas = query({
  args: {},
  returns: v.array(v.object({ _id: v.id("clientes"), nombre: v.string() })),
  handler: async (ctx) => {
    await requireUsuario(ctx);
    const activos = await ctx.db
      .query("clientes")
      .withIndex("por_archivado", (q) => q.eq("archivado", false))
      .take(500);
    return activos.map((c) => ({ _id: c._id, nombre: c.nombre }));
  },
});

// ---------- Ficha 360 (P4 · TAL-13) ----------

// Techos de lectura por bloque (el MVP tiene poco por cliente; evita `.collect()` sin cota).
const MAX_INTERACCIONES = 50;
const MAX_VENTAS = 50;

const fichaCliente = v.object({
  _id: v.id("clientes"),
  nombre: v.string(),
  telefono: v.optional(v.string()),
  email: v.optional(v.string()),
  empresa: v.optional(v.string()),
  cargo: v.optional(v.string()),
  ciudad: v.optional(v.string()),
  canal: v.optional(canalValidator),
  origen: v.optional(origenValidator),
  notas: v.optional(v.string()),
  prioridad: prioridadValidator,
  estado: estadoValidator, // DERIVADO
  valor: v.number(), // DERIVADO = Σ ventas ganadas (importe*cantidad), no persistido
  propietarioNombre: v.string(),
  creadoEn: v.number(), // _creationTime (fecha de alta)
  ultimoContacto: v.union(v.number(), v.null()), // max(interacciones.fecha)
  proximoSeguimiento: v.union(
    v.null(),
    v.object({
      _id: v.id("seguimientos"),
      motivo: v.union(v.string(), v.null()),
      fechaObjetivo: v.number(),
    }),
  ),
  interacciones: v.array(
    v.object({
      _id: v.id("interacciones"),
      tipo: tipoInteraccionValidator,
      canal: v.optional(canalInteraccionValidator),
      nota: v.union(v.string(), v.null()),
      fecha: v.number(),
      autorNombre: v.string(),
    }),
  ),
  ventas: v.array(
    v.object({
      _id: v.id("ventas"),
      producto: v.string(),
      fecha: v.number(),
      total: v.number(), // DERIVADO = importe * cantidad
      vendedorNombre: v.string(),
    }),
  ),
});

/** Nombre de un usuario, con cache por ejecución y fallback si la referencia no resuelve. */
async function nombreUsuario(
  ctx: QueryCtx,
  id: Id<"usuarios">,
  cache: Map<string, string>,
): Promise<string> {
  const key = id as unknown as string;
  const cacheado = cache.get(key);
  if (cacheado !== undefined) return cacheado;
  const u = await ctx.db.get(id);
  const nombre = u?.nombre ?? "Usuario no disponible";
  cache.set(key, nombre);
  return nombre;
}

/**
 * Ficha 360 del cliente (P4). Reactiva, read-only. Cualquier sesión válida (`requireUsuario`).
 * `null` si no existe o está archivado. Devuelve los DERIVADOS (estado, valor, último contacto)
 * y los bloques poblados en lectura (próximo seguimiento pendiente, historial de interacciones,
 * ventas no archivadas). Las ESCRITURAS de esos bloques llegan en M4/M5.
 */
export const ficha = query({
  args: { id: v.id("clientes") },
  returns: v.union(v.null(), fichaCliente),
  handler: async (ctx, { id }) => {
    await requireUsuario(ctx);
    const c = await ctx.db.get(id);
    if (!c || c.archivado === true) return null;

    const cacheEstado = new Map<string, EstadoCliente>();
    const cacheNombres = new Map<string, string>();

    const estado = await derivarEstadoCliente(ctx, c._id, cacheEstado);
    const valor = await derivarValorCliente(ctx, c._id);
    const propietarioNombre = await nombreUsuario(ctx, c.propietario, cacheNombres);

    // Historial de interacciones (más recientes primero por la FECHA de dominio). El primer
    // registro es también el "último contacto" → una sola lectura sirve a ambos.
    const inters = await ctx.db
      .query("interacciones")
      .withIndex("por_cliente_fecha", (q) => q.eq("cliente_id", c._id))
      .order("desc")
      .take(MAX_INTERACCIONES);
    const ultimoContacto = inters[0]?.fecha ?? null;
    const interacciones = [];
    for (const i of inters) {
      interacciones.push({
        _id: i._id,
        tipo: i.tipo,
        canal: i.canal,
        nota: i.nota ?? null,
        fecha: i.fecha,
        autorNombre: await nombreUsuario(ctx, i.registrado_por, cacheNombres),
      });
    }

    // Ventas no archivadas (más recientes primero). total = importe * cantidad (derivado).
    const vtas = await ctx.db
      .query("ventas")
      .withIndex("por_cliente_archivado_fecha", (q) =>
        q.eq("cliente_id", c._id).eq("archivado", false),
      )
      .order("desc")
      .take(MAX_VENTAS);
    const ventas = [];
    for (const vta of vtas) {
      ventas.push({
        _id: vta._id,
        producto: vta.producto,
        fecha: vta.fecha,
        total: vta.importe * vta.cantidad,
        vendedorNombre: await nombreUsuario(ctx, vta.vendedor, cacheNombres),
      });
    }

    // Próximo seguimiento pendiente = el de menor fecha_objetivo (acotado por índice, .first()).
    const seg = await ctx.db
      .query("seguimientos")
      .withIndex("por_cliente_estado_fecha", (q) =>
        q.eq("cliente_id", c._id).eq("estado", "pendiente"),
      )
      .order("asc")
      .first();
    const proximoSeguimiento = seg
      ? { _id: seg._id, motivo: seg.motivo ?? null, fechaObjetivo: seg.fecha_objetivo }
      : null;

    return {
      _id: c._id,
      nombre: c.nombre,
      telefono: c.telefono,
      email: c.email,
      empresa: c.empresa,
      cargo: c.cargo,
      ciudad: c.ciudad,
      canal: c.canal,
      origen: c.origen,
      notas: c.notas,
      prioridad: c.prioridad,
      estado,
      valor,
      propietarioNombre,
      creadoEn: c._creationTime,
      ultimoContacto,
      proximoSeguimiento,
      interacciones,
      ventas,
    };
  },
});
