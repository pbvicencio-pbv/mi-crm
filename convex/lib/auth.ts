import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

/**
 * Resolución del usuario de la sesión y autorización (M2.2 / TAL-10).
 * Convención del repo: cada función Convex autoriza DENTRO de sí misma (no hay RLS).
 */

type Ctx = QueryCtx | MutationCtx;

/** Normaliza un correo para comparar/almacenar de forma estable. */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Resuelve el usuario de la sesión.
 *
 * Invariante de seguridad (NO usar `authId ?? dev`):
 *  - Identidad presente → usuario con ese `authId`; si no existe → null (NUNCA cae al fallback dev).
 *  - Identidad ausente + CRM_DEV_USER_EMAIL → usuario dev (solo desarrollo).
 *  - Identidad ausente + sin variable        → null.
 *
 * `getAuthUserId` devuelve el `Id<"users">` de Convex Auth (parsea el subject "userId|sessionId").
 * Se resuelve por el índice `por_authId` con `.unique()` (falla cerrado ante authId duplicado).
 */
export async function resolverUsuario(ctx: Ctx): Promise<Doc<"usuarios"> | null> {
  const authUserId = await getAuthUserId(ctx);

  if (authUserId) {
    // Identidad presente: SOLO se resuelve por su propio authId; si no está
    // aprovisionada, se devuelve null (no hereda la cuenta de desarrollo).
    return await ctx.db
      .query("usuarios")
      .withIndex("por_authId", (q) => q.eq("authId", authUserId))
      .unique();
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
