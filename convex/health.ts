import { query } from "./_generated/server";

/**
 * Query trivial para verificar la conexión con Convex desde la app (M1.2 / TAL-6).
 * Úsala una vez con `useQuery(api.health.ping)` para comprobar el enganche
 * y elimínala cuando la conexión esté confirmada.
 */
export const ping = query({
  args: {},
  handler: async () => {
    return { ok: true, mensaje: "Convex conectado" as const };
  },
});
