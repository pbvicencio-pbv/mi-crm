// Aprovisionamiento de cuentas de acceso (M2.1 / TAL-9). Solo desarrollo.
//
// Seguridad:
//  - `internalAction`/`internalQuery`/`internalMutation`: NO invocables desde clientes.
//  - Env-gate `CRM_ALLOW_SEED`: falla cerrado fuera de un deployment de desarrollo.
//  - Contraseñas desde variables de entorno (`CRM_SEED_PW_*`), NUNCA en el repo.
//  - `createAccount` requiere ActionCtx → la orquestación va en `internalAction` y toda
//    lectura/escritura de tablas se hace vía `internalQuery`/`internalMutation` (sin ctx.db aquí).
//  - Idempotente: la cuenta usable depende de `authAccounts(provider,providerAccountId)` + del
//    enlace `usuarios.authId`. Ante estados parciales/inconsistentes → ABORTA (falla cerrado).

import { ConvexError, v } from "convex/values";
import { internalAction, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { createAccount } from "@convex-dev/auth/server";
import type { DataModel } from "./_generated/dataModel";
import { normalizarEmail } from "./lib/auth";

const EMAIL_DUENA = normalizarEmail("elena.demo@pulsecrm.test");
const EMAIL_VENDEDOR = normalizarEmail("carlos.demo@pulsecrm.test");
const EMAIL_MARTA = normalizarEmail("marta.demo@pulsecrm.test");

const CUENTAS = [
  { email: EMAIL_DUENA, nombre: "Elena Vargas", rol: "duena" as const, passEnv: "CRM_SEED_PW_DUENA" },
  { email: EMAIL_VENDEDOR, nombre: "Carlos Méndez", rol: "vendedor" as const, passEnv: "CRM_SEED_PW_VENDEDOR" },
  { email: EMAIL_MARTA, nombre: "Marta", rol: "duena" as const, passEnv: "CRM_SEED_PW_MARTA" },
];

/** Lee el estado de una cuenta: authAccount (login-capable) + usuarios de dominio. */
export const estadoCuenta = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const cuenta = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email),
      )
      .unique();
    const usuario = await ctx.db
      .query("usuarios")
      .withIndex("por_email", (q) => q.eq("email", email))
      .unique();
    return {
      authUserId: cuenta?.userId ?? null,
      usuario: usuario ? { _id: usuario._id, authId: usuario.authId ?? null, rol: usuario.rol } : null,
    };
  },
});

/** Upsert del usuario de dominio con su enlace `authId`. Falla cerrado ante inconsistencias. */
export const enlazarUsuario = internalMutation({
  args: {
    email: v.string(),
    nombre: v.string(),
    rol: v.union(v.literal("duena"), v.literal("vendedor")),
    authUserId: v.id("users"),
  },
  handler: async (ctx, { email, nombre, rol, authUserId }) => {
    const usuario = await ctx.db
      .query("usuarios")
      .withIndex("por_email", (q) => q.eq("email", email))
      .unique();

    if (usuario) {
      if (usuario.authId && usuario.authId !== authUserId) {
        throw new ConvexError(
          `Estado inconsistente: ${email} ya está enlazado a otra identidad; abortando.`,
        );
      }
      if (usuario.rol !== rol) {
        throw new ConvexError(
          `Estado inconsistente: ${email} existe con rol distinto (${usuario.rol}); abortando.`,
        );
      }
      if (!usuario.authId) {
        await ctx.db.patch(usuario._id, { authId: authUserId });
      }
      return usuario._id;
    }
    return await ctx.db.insert("usuarios", { nombre, email, rol, authId: authUserId, activo: true });
  },
});

export const run = internalAction({
  args: {},
  handler: async (ctx) => {
    if (process.env.CRM_ALLOW_SEED !== "true") {
      throw new ConvexError(
        "Aprovisionamiento deshabilitado. Define CRM_ALLOW_SEED=true en el deployment de desarrollo.",
      );
    }

    const resultados: Array<{ email: string; accion: string }> = [];

    for (const c of CUENTAS) {
      const estado = await ctx.runQuery(internal.seedAuth.estadoCuenta, { email: c.email });

      if (estado.authUserId) {
        // La cuenta de login ya existe. Reconciliar: el enlace de dominio debe apuntar a ella.
        if (estado.usuario?.authId && estado.usuario.authId !== estado.authUserId) {
          throw new ConvexError(
            `Estado inconsistente para ${c.email}: authAccount y usuarios.authId difieren.`,
          );
        }
        await ctx.runMutation(internal.seedAuth.enlazarUsuario, {
          email: c.email,
          nombre: c.nombre,
          rol: c.rol,
          authUserId: estado.authUserId,
        });
        resultados.push({ email: c.email, accion: "reconciliado" });
        continue;
      }

      // No hay cuenta de login: crearla (hashea con Scrypt) y enlazar el usuario de dominio.
      const secret = process.env[c.passEnv];
      if (!secret) {
        throw new ConvexError(`Falta la variable ${c.passEnv} para aprovisionar ${c.email}.`);
      }
      if (secret.length < 8) {
        throw new ConvexError(`${c.passEnv} debe tener al menos 8 caracteres.`);
      }

      const { user } = await createAccount<DataModel>(ctx, {
        provider: "password",
        account: { id: c.email, secret },
        profile: { email: c.email },
      });

      await ctx.runMutation(internal.seedAuth.enlazarUsuario, {
        email: c.email,
        nombre: c.nombre,
        rol: c.rol,
        authUserId: user._id,
      });
      resultados.push({ email: c.email, accion: "creado" });
    }

    return { ok: true, resultados };
  },
});
