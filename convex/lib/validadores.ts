// Validadores de dominio compartidos entre funciones Convex (patrón `convex/lib/*`).
// Los `convex/*.ts` públicos solo exportan funciones Convex o `export {}`; lo reutilizable vive aquí.
//
// `interacciones.registrar` (M4 · TAL-14) es dueña funcional de la mutation; estos validadores los
// consumen tanto `interacciones.ts` (args de la mutation) como `clientes.ts` (forma de la ficha 360).

import { v } from "convex/values";

/** Tipo de una interacción (schema `interacciones.tipo`). */
export const tipoInteraccionValidator = v.union(
  v.literal("llamada"),
  v.literal("mensaje"),
  v.literal("visita"),
);

/** Canal de una interacción — mismo conjunto que el del cliente, en el orden del schema. */
export const canalInteraccionValidator = v.union(
  v.literal("whatsapp"),
  v.literal("email"),
  v.literal("telefono"),
  v.literal("instagram"),
);
