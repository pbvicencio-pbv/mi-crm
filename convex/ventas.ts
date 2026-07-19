// Funciones de Convex para `ventas` (M5 · TAL-18 / TAL-50).
//
//  - crearVenta(...): alta desde la ficha (P8) o desde la pantalla Ventas.
//  - listar() / actualizarVenta(...) / archivarVenta({id}): pantalla Ventas (TAL-50).
//
// Autorización DENTRO de cada función (no RLS). Modelo de RESPONSABILIDAD (D1): la DUEÑA opera
// todas las ventas; un VENDEDOR solo puede registrar a su nombre y editar/archivar las suyas
// (`venta.vendedor === yo._id`). El estado de las ventas alimenta el estado y el valor DERIVADOS
// del cliente (convex/lib/derivados.ts). Contrato de soft-delete: las ventas de un cliente
// archivado/inexistente se tratan como inexistentes (no se listan ni se pueden mutar).
//
// `total` = importe * cantidad es DERIVADO; no se persiste.
// Diseño de referencia: overlay `venta` y ruta `ventas` en design/PROY CRM Pulse/CRM Pulse.dc.html.

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireUsuario } from "./lib/auth";

const estadoVentaValidator = v.union(
  v.literal("abierta"),
  v.literal("ganada"),
  v.literal("perdida"),
);

// Topes server-side (el cliente no puede saltárselos).
const MAX_PRODUCTO = 200;
const MAX_IMPORTE = 1_000_000_000; // $1B: acota importes absurdos sin estorbar al MVP
const MAX_CANTIDAD = 100_000;
const TOLERANCIA_FUTURO_MS = 5 * 60 * 1000; // 5 min: cubre desfases de reloj sin permitir futuro real

/** Autorización de escritura por responsabilidad (D1): dueña todas; vendedor solo las suyas. */
export function puedeOperarVenta(usuario: Doc<"usuarios">, venta: Doc<"ventas">): boolean {
  return usuario.rol === "duena" || venta.vendedor === usuario._id;
}

/**
 * Resuelve el `vendedor` de una alta según D1:
 *  - vendedor → SOLO a su nombre (si intenta asignar a otro, se rechaza).
 *  - dueña    → cualquier vendedor activo (default = ella).
 */
async function resolverVendedor(
  ctx: MutationCtx,
  usuario: Doc<"usuarios">,
  vendedorArg: Id<"usuarios"> | undefined,
): Promise<Id<"usuarios">> {
  if (usuario.rol !== "duena") {
    if (vendedorArg !== undefined && vendedorArg !== usuario._id) {
      throw new ConvexError("Un vendedor solo puede registrar ventas a su nombre");
    }
    return usuario._id;
  }
  if (vendedorArg === undefined) return usuario._id;
  const u = await ctx.db.get(vendedorArg);
  if (!u || u.activo === false) throw new ConvexError("El vendedor no es un usuario válido");
  return vendedorArg;
}

/** Valida producto/importe/cantidad (comunes a alta y edición). Devuelve el producto recortado. */
function validarCampos(producto: string, importe: number, cantidad: number): string {
  const p = producto.trim();
  if (!p) throw new ConvexError("El producto es obligatorio");
  if (p.length > MAX_PRODUCTO) throw new ConvexError(`El producto no puede superar ${MAX_PRODUCTO} caracteres`);
  if (!Number.isFinite(importe) || importe <= 0 || importe > MAX_IMPORTE) {
    throw new ConvexError("El importe no es válido");
  }
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) {
    throw new ConvexError("La cantidad no es válida");
  }
  return p;
}

/** `fecha` omitida → ahora; presente → entero-seguro / >0 / no-futura (tol. 5 min). */
function resolverFecha(fecha: number | undefined): number {
  const f = fecha ?? Date.now();
  if (!Number.isSafeInteger(f) || f <= 0 || f > Date.now() + TOLERANCIA_FUTURO_MS) {
    throw new ConvexError("La fecha de la venta no es válida");
  }
  return f;
}

/**
 * Registrar una venta (P8 · TAL-18). Cualquier sesión válida; `registrado_por` = usuario actual.
 * `vendedor` resuelto por D1. Rechaza cliente inexistente o archivado. Inserta con `archivado:false`;
 * el estado/valor del cliente se recalculan solos (derivados) y la venta aparece en la ficha.
 */
export const crearVenta = mutation({
  args: {
    cliente_id: v.id("clientes"),
    producto: v.string(),
    importe: v.number(),
    cantidad: v.number(),
    estado: v.optional(estadoVentaValidator),
    fecha: v.optional(v.number()),
    vendedor: v.optional(v.id("usuarios")),
  },
  returns: v.id("ventas"),
  handler: async (ctx, args) => {
    const usuario = await requireUsuario(ctx);

    const cliente = await ctx.db.get(args.cliente_id);
    if (!cliente || cliente.archivado === true) throw new ConvexError("Cliente no encontrado");

    const producto = validarCampos(args.producto, args.importe, args.cantidad);
    const fecha = resolverFecha(args.fecha);
    const vendedor = await resolverVendedor(ctx, usuario, args.vendedor);

    return await ctx.db.insert("ventas", {
      cliente_id: args.cliente_id,
      producto,
      importe: args.importe,
      cantidad: args.cantidad,
      estado: args.estado ?? "abierta",
      fecha,
      vendedor,
      registrado_por: usuario._id,
      archivado: false,
    });
  },
});

// ---------- Pantalla Ventas (P9 · TAL-50) ----------

const MAX_VENTAS_LISTA = 500;

const filaVenta = v.object({
  _id: v.id("ventas"),
  cliente_id: v.id("clientes"),
  producto: v.string(),
  importe: v.number(),
  cantidad: v.number(),
  total: v.number(), // DERIVADO = importe * cantidad
  estado: estadoVentaValidator,
  fecha: v.number(),
  vendedor: v.id("usuarios"), // para gatear ⋮ Editar/Eliminar por D1 en el cliente
  clienteNombre: v.string(),
  vendedorNombre: v.string(),
});

/** Cliente cacheado por ejecución (una lectura por cliente único). */
async function getClienteCache(
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

/** Nombre del vendedor con cache por ejecución y fallback si la referencia no resuelve. */
async function nombreVendedor(
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
 * Lista de ventas para la pantalla /ventas (P9). Cualquier sesión válida; la LECTURA es company-wide
 * (no scoped por vendedor), consistente con la lista de clientes y la ficha. **Cascada de soft-delete**
 * (contrato TAL-59): descarta ventas cuyo cliente no existe o está archivado. `total` derivado. KPIs,
 * contadores y filtros (estado/cliente/periodo) se calculan en el cliente (dataset pequeño; evita
 * `Date.now()` en la query). Acotada a las MAX_VENTAS_LISTA más recientes por creación; orden final
 * por FECHA de dominio desc en JS (no hay índice global por fecha).
 */
export const listar = query({
  args: {},
  returns: v.array(filaVenta),
  handler: async (ctx) => {
    await requireUsuario(ctx);
    const ventas = await ctx.db
      .query("ventas")
      .withIndex("por_archivado", (q) => q.eq("archivado", false))
      .order("desc")
      .take(MAX_VENTAS_LISTA);

    const cacheCliente = new Map<string, Doc<"clientes"> | null>();
    const cacheVendedor = new Map<string, string>();
    const filas = [];
    for (const vta of ventas) {
      const cliente = await getClienteCache(ctx, vta.cliente_id, cacheCliente);
      if (!cliente || cliente.archivado === true) continue; // cascada de soft-delete
      filas.push({
        _id: vta._id,
        cliente_id: vta.cliente_id,
        producto: vta.producto,
        importe: vta.importe,
        cantidad: vta.cantidad,
        total: vta.importe * vta.cantidad,
        estado: vta.estado,
        fecha: vta.fecha,
        vendedor: vta.vendedor,
        clienteNombre: cliente.nombre,
        vendedorNombre: await nombreVendedor(ctx, vta.vendedor, cacheVendedor),
      });
    }
    filas.sort((a, b) => b.fecha - a.fecha);
    return filas;
  },
});

/**
 * Editar una venta (⋮ Editar). Falla CERRADO si la venta o su cliente están archivados/inexistentes
 * (no se mutan registros ocultos por soft-delete). Autoriza por D1 (dueña o vendedor dueño). El
 * `cliente_id` NO se toca (D7: no re-parentar). Corta y acotada (get→validar→patch) → evita OCC.
 */
export const actualizarVenta = mutation({
  args: {
    id: v.id("ventas"),
    producto: v.string(),
    importe: v.number(),
    cantidad: v.number(),
    estado: estadoVentaValidator,
    fecha: v.optional(v.number()),
    vendedor: v.id("usuarios"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const usuario = await requireUsuario(ctx);
    const venta = await ctx.db.get(args.id);
    if (!venta || venta.archivado === true) throw new ConvexError("Venta no encontrada");
    const cliente = await ctx.db.get(venta.cliente_id);
    if (!cliente || cliente.archivado === true) throw new ConvexError("Cliente no encontrado");
    if (!puedeOperarVenta(usuario, venta)) throw new ConvexError("No autorizado para modificar esta venta");

    const producto = validarCampos(args.producto, args.importe, args.cantidad);
    const fecha = resolverFecha(args.fecha);
    const vendedor = await resolverVendedor(ctx, usuario, args.vendedor);
    await ctx.db.patch(args.id, {
      producto,
      importe: args.importe,
      cantidad: args.cantidad,
      estado: args.estado,
      fecha,
      vendedor,
    });
    return null;
  },
});

/**
 * Archivar una venta (⋮ Eliminar · soft-delete). Autoriza por D1 **ANTES** de la idempotencia (no
 * revela `yaArchivado` a quien no puede operarla). Idempotente: si ya está archivada, no-op. No se
 * bloquea por cliente archivado (archivar es la propia baja y esas ventas ya no se listan por la
 * cascada de `listar`).
 */
export const archivarVenta = mutation({
  args: { id: v.id("ventas") },
  returns: v.object({ ok: v.boolean(), yaArchivado: v.boolean() }),
  handler: async (ctx, { id }) => {
    const usuario = await requireUsuario(ctx);
    const venta = await ctx.db.get(id);
    if (!venta) throw new ConvexError("Venta no encontrada");
    if (!puedeOperarVenta(usuario, venta)) throw new ConvexError("No autorizado para archivar esta venta");
    if (venta.archivado === true) return { ok: true, yaArchivado: true };
    await ctx.db.patch(id, { archivado: true });
    return { ok: true, yaArchivado: false };
  },
});
