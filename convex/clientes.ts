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
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireUsuario } from "./lib/auth";

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

/** Recorta un opcional; cadena vacía → `undefined` (en `patch`, `undefined` limpia el campo). */
function limpiar(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t ? t : undefined;
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
    const nombre = args.nombre.trim();
    if (!nombre) throw new ConvexError("El nombre es obligatorio");
    const propietario = await resolverPropietario(ctx, args.propietario, yo._id);
    return await ctx.db.insert("clientes", {
      nombre,
      telefono: limpiar(args.telefono),
      email: limpiar(args.email),
      empresa: limpiar(args.empresa),
      cargo: limpiar(args.cargo),
      ciudad: limpiar(args.ciudad),
      canal: args.canal,
      origen: args.origen,
      notas: limpiar(args.notas),
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
    const nombre = args.nombre.trim();
    if (!nombre) throw new ConvexError("El nombre es obligatorio");
    const propietario = await resolverPropietario(ctx, args.propietario, yo._id);
    await ctx.db.patch(args.id, {
      nombre,
      telefono: limpiar(args.telefono),
      email: limpiar(args.email),
      empresa: limpiar(args.empresa),
      cargo: limpiar(args.cargo),
      ciudad: limpiar(args.ciudad),
      canal: args.canal,
      origen: args.origen,
      notas: limpiar(args.notas),
      prioridad: args.prioridad,
      propietario,
    });
    return null;
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
