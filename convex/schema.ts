import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/**
 * Esquema de CRM Pulse (M1.3 / TAL-7).
 * 5 entidades: clientes, interacciones, seguimientos, ventas, usuarios.
 * El Cliente es el centro; de él cuelgan interacciones, seguimientos y ventas (1→N).
 *
 * Derivados (NO se persisten; se calculan en queries):
 *  - estado del cliente: nuevo_lead | en_negociacion | ganado | perdido (según sus ventas no archivadas).
 *  - valor del cliente: suma de ventas en estado "ganada" (no archivadas).
 *  - último contacto: max(interacciones.fecha).
 *  - total de venta: importe * cantidad.
 *
 * Borrado = archivar (soft-delete): campo `archivado`. Las listas filtran archivado == false
 * y los derivados/KPIs ignoran los archivados.
 *
 * Fecha de alta = `_creationTime` (lo añade Convex automáticamente, junto con `_id`).
 */
export default defineSchema({
  // Tablas de Convex Auth (M2.1 / TAL-9): users, authSessions, authAccounts,
  // authRefreshTokens, authVerificationCodes, authVerifiers, authRateLimits.
  ...authTables,

  clientes: defineTable({
    nombre: v.string(),
    telefono: v.optional(v.string()),
    email: v.optional(v.string()),
    empresa: v.optional(v.string()),
    cargo: v.optional(v.string()),
    ciudad: v.optional(v.string()),
    // canal de CONTACTO habitual
    canal: v.optional(
      v.union(
        v.literal("whatsapp"),
        v.literal("instagram"),
        v.literal("telefono"),
        v.literal("email"),
      ),
    ),
    // ORIGEN de captación (cómo nos conoció)
    origen: v.optional(
      v.union(
        v.literal("recomendacion"),
        v.literal("campana"),
        v.literal("sitio_web"),
        v.literal("evento"),
        v.literal("otro"),
      ),
    ),
    notas: v.optional(v.string()),
    prioridad: v.union(v.literal("alta"), v.literal("media"), v.literal("baja")),
    propietario: v.id("usuarios"),
    registrado_por: v.id("usuarios"),
    archivado: v.boolean(),
    // NOTA: `estado` y `valor` NO se guardan aquí: son derivados (ver cabecera).
  })
    .index("por_propietario", ["propietario"])
    .index("por_prioridad", ["prioridad"])
    .index("por_archivado", ["archivado"])
    .searchIndex("buscar_nombre", { searchField: "nombre" }),

  interacciones: defineTable({
    cliente_id: v.id("clientes"),
    tipo: v.union(v.literal("llamada"), v.literal("mensaje"), v.literal("visita")),
    canal: v.optional(
      v.union(
        v.literal("whatsapp"),
        v.literal("email"),
        v.literal("telefono"),
        v.literal("instagram"),
      ),
    ),
    nota: v.optional(v.string()),
    fecha: v.number(), // timestamp (ms)
    registrado_por: v.id("usuarios"),
  }).index("por_cliente", ["cliente_id"]),

  seguimientos: defineTable({
    cliente_id: v.id("clientes"),
    fecha_objetivo: v.number(), // timestamp del próximo contacto
    motivo: v.optional(v.string()),
    estado: v.union(v.literal("pendiente"), v.literal("hecho")),
    responsable: v.id("usuarios"),
    fecha_cierre: v.optional(v.number()),
  })
    .index("por_cliente", ["cliente_id"])
    // Para la Agenda del día (vencidos / hoy / próximas):
    .index("por_estado_fecha", ["estado", "fecha_objetivo"])
    // Agenda con el scope del vendedor aplicado DENTRO del índice, antes de cualquier
    // límite/paginación (TAL-16): responsable → estado → fecha_objetivo.
    .index("por_responsable_estado_fecha", ["responsable", "estado", "fecha_objetivo"]),

  ventas: defineTable({
    cliente_id: v.id("clientes"),
    producto: v.string(), // texto libre (en el MVP no hay catálogo)
    importe: v.number(), // en dólares ($)
    cantidad: v.number(),
    estado: v.union(v.literal("abierta"), v.literal("ganada"), v.literal("perdida")),
    fecha: v.number(),
    vendedor: v.id("usuarios"),
    registrado_por: v.id("usuarios"),
    archivado: v.boolean(),
    // NOTA: `total` = importe * cantidad es derivado; no se persiste.
  })
    .index("por_cliente", ["cliente_id"])
    .index("por_estado", ["estado"])
    .index("por_archivado", ["archivado"])
    // Derivación del estado del cliente con lecturas constantes (TAL-16): por cada
    // cliente, .first() acotado sobre (cliente_id, archivado, estado).
    .index("por_cliente_archivado_estado", ["cliente_id", "archivado", "estado"]),

  usuarios: defineTable({
    nombre: v.string(),
    email: v.string(),
    rol: v.union(v.literal("duena"), v.literal("vendedor")),
    // Enlace con la identidad de Convex Auth (users._id). Se fija al aprovisionar (seedAuth).
    authId: v.optional(v.id("users")),
    // La contraseña NO se guarda aquí: la gestiona Convex Auth.
  })
    .index("por_email", ["email"])
    .index("por_authId", ["authId"]),
});
