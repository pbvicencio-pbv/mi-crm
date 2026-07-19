// Utilidades SOLO para pruebas E2E (TAL-20). Diseñadas para el deployment DESECHABLE de E2E:
//  - `internalMutation`: NO invocable desde clientes (sí desde `npx convex run e2e:resetE2E`).
//  - Env-gate `E2E_ALLOW_RESET`: falla CERRADO. En producción (sin la variable) lanza y no hace
//    nada — por eso es seguro que la función exista en todos los deployments.
//  - `resetE2E` hace un WIPE de los datos de dominio; por eso NUNCA debe habilitarse en el
//    deployment que sirve producción (`elated-donkey-854`).

import { internalMutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { sembrarDemo } from "./seed";

/**
 * Deja el deployment DESECHABLE de E2E en un baseline conocido y repetible: borra TODOS los datos
 * de dominio (clientes/interacciones/seguimientos/ventas) y re-siembra el dataset demo. NO toca
 * `usuarios` ni las tablas de Convex Auth (las cuentas se aprovisionan una vez con `seedAuth`).
 * Env-gate `E2E_ALLOW_RESET=true` (fail-closed): en cualquier deployment sin esa variable, lanza.
 */
export const resetE2E = internalMutation({
  args: {},
  returns: v.object({
    ok: v.boolean(),
    usuarios: v.object({ duena: v.id("usuarios"), vendedor: v.id("usuarios") }),
    clientes: v.number(),
  }),
  handler: async (ctx) => {
    if (process.env.E2E_ALLOW_RESET !== "true") {
      throw new ConvexError(
        "resetE2E deshabilitado: define E2E_ALLOW_RESET=true SOLO en el deployment desechable de E2E.",
      );
    }
    // Wipe total de datos de dominio (el deployment es desechable; no hay datos que preservar).
    for (const tabla of ["ventas", "seguimientos", "interacciones", "clientes"] as const) {
      for (const fila of await ctx.db.query(tabla).collect()) {
        await ctx.db.delete(fila._id);
      }
    }
    return await sembrarDemo(ctx);
  },
});
