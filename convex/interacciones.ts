// Funciones de Convex para `interacciones` (M4 · TAL-14).
//
//  - registrar(...): tipo (llamada/mensaje/visita) + canal (whatsapp/email/telefono/instagram) + nota + fecha.
//    El "medio" mostrado se deriva en la UI (visita→En persona, llamada→Llamada, mensaje→canal).
//
// Autorización DENTRO de la función (no RLS): `requireUsuario`; cualquier sesión válida registra en el MVP.
// `registrado_por` se fija en el servidor (nunca desde el cliente). El historial y el "último contacto"
// (max(fecha)) los lee `clientes.ficha` de forma reactiva: NO hay que tocar esa query al insertar aquí.
//
// Diseño de referencia: design/PROY CRM Pulse/InteraccionForm.

import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUsuario } from "./lib/auth";
import { tipoInteraccionValidator, canalInteraccionValidator } from "./lib/validadores";

// Margen de reloj para el guardia "no futuro": el form nunca envía "hoy" (lo omite → Date.now()),
// así que este colchón solo absorbe desfases menores de reloj de un llamador directo.
const TOLERANCIA_FUTURO_MS = 5 * 60_000;
const MAX_NOTA = 2000;

/**
 * Registrar una interacción (P6). Rechaza si el cliente no existe o está archivado.
 *
 * Contrato de `fecha` (ver TAL-14): timestamp en ms.
 *  - Ausente → se usa `Date.now()` del servidor (caso "hoy"): hora real, ordena y gana como último contacto.
 *  - Presente → debe ser un entero seguro, > 0 y no futuro (con tolerancia de reloj); si no, se rechaza.
 *    NO se confía en el `max=hoy` del input: un llamador directo podría mandar un timestamp arbitrario.
 *
 * `canal` se normaliza al tipo: solo tiene sentido en "mensaje"; en llamada/visita se descarta (undefined),
 * evitando combinaciones sucias (p. ej. visita + whatsapp) que el schema permitiría.
 */
export const registrar = mutation({
  args: {
    cliente_id: v.id("clientes"),
    tipo: tipoInteraccionValidator,
    canal: v.optional(canalInteraccionValidator),
    nota: v.optional(v.string()),
    fecha: v.optional(v.number()),
  },
  returns: v.id("interacciones"),
  handler: async (ctx, args) => {
    const usuario = await requireUsuario(ctx);

    const cliente = await ctx.db.get(args.cliente_id);
    if (!cliente || cliente.archivado === true) throw new ConvexError("Cliente no encontrado");

    if (args.fecha !== undefined) {
      const f = args.fecha;
      if (!Number.isSafeInteger(f) || f <= 0 || f > Date.now() + TOLERANCIA_FUTURO_MS) {
        throw new ConvexError("Fecha inválida");
      }
    }
    const fecha = args.fecha ?? Date.now();

    const notaLimpia = args.nota?.trim();
    const nota = notaLimpia ? notaLimpia : undefined;
    if (nota !== undefined && nota.length > MAX_NOTA) {
      throw new ConvexError("La nota es demasiado larga");
    }

    // `canal` solo aplica a "mensaje"; en llamada/visita se descarta.
    const canal = args.tipo === "mensaje" ? args.canal : undefined;

    return await ctx.db.insert("interacciones", {
      cliente_id: args.cliente_id,
      tipo: args.tipo,
      canal,
      nota,
      fecha,
      registrado_por: usuario._id,
    });
  },
});
