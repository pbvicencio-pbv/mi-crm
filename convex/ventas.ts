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
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
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
