import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

/**
 * Resolución del usuario de la sesión y autorización (TAL-16 / TAL-8).
 * Convención del repo: cada función Convex autoriza DENTRO de sí misma (no hay RLS).
 * El login real (Convex Auth Password) llega en M2.2/TAL-10; aquí queda el punto de
 * enganche con un fallback dev EXPLÍCITO y env-gated.
 */

type Ctx = QueryCtx | MutationCtx;

/** Normaliza un correo para comparar/almacenar de forma estable. */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Resuelve el usuario de la sesión.
 *
 * Invariante de seguridad (NO usar `identidad ?? dev`):
 *  - Identidad presente + email con usuario → ese usuario.
 *  - Identidad presente + email SIN usuario  → null (NUNCA cae al fallback dev).
 *  - Identidad ausente + CRM_DEV_USER_EMAIL  → usuario dev (solo desarrollo).
 *  - Identidad ausente + sin variable        → null.
 *
 * Resolución por email normalizado sobre `por_email`, con `.unique()` (falla cerrado
 * si hay correos duplicados). No se usa authId porque el esquema no lo indexa.
 */
export async function resolverUsuario(ctx: Ctx): Promise<Doc<"usuarios"> | null> {
  const identidad = await ctx.auth.getUserIdentity();

  if (identidad) {
    // Identidad presente: SOLO se resuelve por su propio email; si no está
    // aprovisionado, se devuelve null (no hereda la cuenta de desarrollo).
    if (!identidad.email) return null;
    return await buscarPorEmail(ctx, normalizarEmail(identidad.email));
  }

  const devEmail = process.env.CRM_DEV_USER_EMAIL;
  if (devEmail) {
    return await buscarPorEmail(ctx, normalizarEmail(devEmail));
  }
  return null;
}

async function buscarPorEmail(ctx: Ctx, email: string): Promise<Doc<"usuarios"> | null> {
  // `.unique()` lanza si hay más de un match → falla cerrado ante emails duplicados.
  return await ctx.db
    .query("usuarios")
    .withIndex("por_email", (q) => q.eq("email", email))
    .unique();
}

/** Igual que `resolverUsuario` pero exige sesión: falla cerrado si no hay usuario. */
export async function requireUsuario(ctx: Ctx): Promise<Doc<"usuarios">> {
  const usuario = await resolverUsuario(ctx);
  if (!usuario) {
    throw new ConvexError("No autenticado");
  }
  return usuario;
}
