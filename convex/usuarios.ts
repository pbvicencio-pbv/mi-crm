// Funciones de Convex para `usuarios` (M2 · TAL-9 / TAL-32 / TAL-48).
//
//  - actual(): el usuario de la sesión (perfil + rol) o null. Se usa para el saludo
//    y el gating del nav; NO otorga privilegios por sí sola (las funciones protegidas
//    usan requireUsuario). listar()/CRUD de equipo llegan en M2.3/M2.4.

import { query } from "./_generated/server";
import { resolverUsuario } from "./lib/auth";

export const actual = query({
  args: {},
  handler: async (ctx) => {
    const u = await resolverUsuario(ctx);
    if (!u) return null;
    return { _id: u._id, nombre: u.nombre, email: u.email, rol: u.rol };
  },
});
