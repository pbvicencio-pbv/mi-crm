// Semilla de datos de DEMO para la Agenda del día (TAL-16). Solo desarrollo.
//
// Seguridad:
//  - `internalMutation`: NO es invocable desde clientes (sí desde `npx convex run seed:run`).
//  - Env-gate `CRM_ALLOW_SEED`: falla cerrado fuera de un deployment de desarrollo.
//  - Borrado ACOTADO: solo toca registros marcados `[DEMO:TAL-16]` de usuarios demo;
//    nunca hace un wipe global.
//  - Usuarios demo por email reservado: se upsertan (no se borran); si el email ya
//    pertenece a una cuenta con autenticación o con otro rol, ABORTA.
//
// `sembrarDemo` (helper exportado, SIN gate) contiene la lógica; la reutiliza `e2e.resetE2E`
// (TAL-20) para dejar el deployment desechable de E2E en un baseline conocido.

import { internalMutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { normalizarEmail } from "./lib/auth";
import { calcularIntervalos } from "./lib/fechas";

const DEMO = "[DEMO:TAL-16]";
const TZ_DEMO = "America/Mexico_City";
const EMAIL_DUENA = normalizarEmail("elena.demo@pulsecrm.test");
const EMAIL_VENDEDOR = normalizarEmail("carlos.demo@pulsecrm.test");

const H = 3_600_000;
const D = 86_400_000;

async function upsertUsuarioDemo(
  ctx: MutationCtx,
  email: string,
  nombre: string,
  rol: "duena" | "vendedor",
) {
  const existente = await ctx.db
    .query("usuarios")
    .withIndex("por_email", (q) => q.eq("email", email))
    .unique();

  if (existente) {
    if (existente.authId) {
      throw new ConvexError(
        `El email demo ${email} ya pertenece a una cuenta con autenticación; abortando la semilla.`,
      );
    }
    if (existente.rol !== rol) {
      throw new ConvexError(
        `El email demo ${email} existe con rol distinto (${existente.rol}); abortando para no cambiar el rol.`,
      );
    }
    // No se modifica en silencio una cuenta existente: se reutiliza tal cual.
    return existente;
  }

  const id = await ctx.db.insert("usuarios", { nombre, email, rol });
  return (await ctx.db.get(id))!;
}

async function borrarDependientes(ctx: MutationCtx, clienteId: Id<"clientes">) {
  for (const tabla of ["seguimientos", "interacciones", "ventas"] as const) {
    const filas = await ctx.db
      .query(tabla)
      .withIndex("por_cliente", (q) => q.eq("cliente_id", clienteId))
      .collect();
    for (const f of filas) await ctx.db.delete(f._id);
  }
}

/**
 * Siembra (o re-siembra) el dataset demo de la Agenda. SIN env-gate: cada caller aplica el suyo
 * (`run` → `CRM_ALLOW_SEED`; `e2e.resetE2E` → `E2E_ALLOW_RESET`). Antes de insertar, borra de forma
 * ACOTADA los clientes demo previos (marcados `[DEMO]`, de usuarios demo) y sus dependientes, para
 * ser idempotente. Reutiliza los usuarios demo si ya existen (no cambia rol/nombre).
 */
export async function sembrarDemo(ctx: MutationCtx) {
  // 1) Usuarios demo (upsert seguro).
  const duena = await upsertUsuarioDemo(ctx, EMAIL_DUENA, "Elena Vargas", "duena");
  const vendedor = await upsertUsuarioDemo(ctx, EMAIL_VENDEDOR, "Carlos Méndez", "vendedor");
  const dueños = new Set<string>([
    duena._id as unknown as string,
    vendedor._id as unknown as string,
  ]);

  // 2) Borrado ACOTADO de datos demo previos (clientes marcados de usuarios demo).
  const clientes = await ctx.db.query("clientes").collect();
  for (const c of clientes) {
    const esDemo =
      (c.notas ?? "").startsWith(DEMO) && dueños.has(c.propietario as unknown as string);
    if (!esDemo) continue;
    await borrarDependientes(ctx, c._id);
    await ctx.db.delete(c._id);
  }

  // 3) Reinsertar el dataset demo.
  const now = Date.now();

  const crearCliente = async (
    nombre: string,
    prioridad: "alta" | "media" | "baja",
    propietario: Id<"usuarios">,
  ) =>
    await ctx.db.insert("clientes", {
      nombre,
      prioridad,
      propietario,
      registrado_por: propietario,
      archivado: false,
      notas: `${DEMO} cliente de demostración`,
    });

  const crearVenta = async (
    clienteId: Id<"clientes">,
    estado: "abierta" | "ganada" | "perdida",
    importe: number,
    vendedorId: Id<"usuarios">,
  ) =>
    await ctx.db.insert("ventas", {
      cliente_id: clienteId,
      producto: "Plan anual",
      importe,
      cantidad: 1,
      estado,
      fecha: now - 3 * D,
      vendedor: vendedorId,
      registrado_por: vendedorId,
      archivado: false,
    });

  const crearSeguimiento = async (
    clienteId: Id<"clientes">,
    fecha_objetivo: number,
    motivo: string,
    responsable: Id<"usuarios">,
    estado: "pendiente" | "hecho" = "pendiente",
  ) =>
    await ctx.db.insert("seguimientos", {
      cliente_id: clienteId,
      fecha_objetivo,
      motivo,
      estado,
      responsable,
      ...(estado === "hecho" ? { fecha_cierre: now - 5 * D } : {}),
    });

  const laura = await crearCliente("Laura Fernández", "alta", vendedor._id);
  const ana = await crearCliente("Ana Torres", "media", vendedor._id);
  const miguel = await crearCliente("Miguel Ruiz", "baja", vendedor._id);
  const sofia = await crearCliente("Sofía Ramírez", "media", vendedor._id);
  const diego = await crearCliente("Diego Herrera", "alta", duena._id);

  // Ventas → estados derivados: en_negociacion / ganado / perdido / nuevo_lead.
  await crearVenta(laura, "abierta", 12000, vendedor._id);
  await crearVenta(ana, "ganada", 48000, vendedor._id);
  await crearVenta(miguel, "perdida", 8000, vendedor._id);
  await crearVenta(diego, "abierta", 26000, duena._id);
  // Sofía: sin ventas → nuevo_lead.

  // Límites del día local (zona demo) para no depender de la hora de ejecución.
  const hoyDemo = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_DEMO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
  const iv = calcularIntervalos({ timeZone: TZ_DEMO, fechaLocal: hoyDemo }, now);
  const medio = Math.floor((iv.inicioHoy + iv.finHoy) / 2);

  // Vencidos (< inicioHoy)
  await crearSeguimiento(laura, iv.inicioHoy - 4 * H, "Llamar sobre la propuesta", vendedor._id);
  await crearSeguimiento(ana, iv.inicioHoy - 2 * D, "Enviar contrato revisado", vendedor._id);
  // Hoy: una EXACTAMENTE en `now` (garantiza Hoy en CUALQUIER zona) + otras dentro del día demo.
  await crearSeguimiento(miguel, now, "Confirmar cierre de contrato", vendedor._id);
  await crearSeguimiento(sofia, medio + 2 * H, "Enviar cotización revisada", vendedor._id);
  await crearSeguimiento(diego, medio - 2 * H, "Reunión de seguimiento", duena._id);
  // Próximas (>= finHoy)
  await crearSeguimiento(ana, iv.finHoy + 4 * H, "Llamada trimestral", vendedor._id);
  await crearSeguimiento(diego, iv.finHoy + 4 * D, "Revisar renovación", duena._id);
  // Uno ya cerrado (no debe aparecer en la agenda).
  await crearSeguimiento(laura, iv.inicioHoy - 5 * D, "Primer contacto", vendedor._id, "hecho");

  return {
    ok: true,
    usuarios: { duena: duena._id, vendedor: vendedor._id },
    clientes: 5,
  };
}

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (process.env.CRM_ALLOW_SEED !== "true") {
      throw new ConvexError(
        "Semilla deshabilitada. Define CRM_ALLOW_SEED=true en el deployment de desarrollo para ejecutarla.",
      );
    }
    return await sembrarDemo(ctx);
  },
});
