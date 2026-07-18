// Funciones de Convex para `usuarios` (M2 · TAL-9 / TAL-32 / TAL-48).
//
//  - actual(): el usuario de la sesión (perfil + rol) o null — saludo / gating del nav.
//  - M2.3 (TAL-32, DUEÑA-only): listar, crearUsuario (action), actualizar, desactivarUsuario (action).
//  - M2.4 (TAL-48, perfil PROPIO): actualizarPerfil, cambiarPassword (action).
//
// Autorización DENTRO de cada función (no RLS): equipo → `requireDuena`; perfil → `requireUsuario`.
// Convex Auth (createAccount/retrieveAccount/modifyAccountCredentials/invalidateSessions) exige
// ActionCtx → la orquestación va en `action` que delega lecturas/escrituras a internalQuery/
// internalMutation (mismo patrón que seedAuth). Baja = soft-delete (`activo=false`), NO borrado.

import { ConvexError, v } from "convex/values";
import { query, mutation, action, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  createAccount,
  retrieveAccount,
  modifyAccountCredentials,
  invalidateSessions,
  getAuthSessionId,
} from "@convex-dev/auth/server";
import type { DataModel } from "./_generated/dataModel";
import { resolverUsuario, requireUsuario, requireDuena, normalizarEmail } from "./lib/auth";

const rolValidator = v.union(v.literal("duena"), v.literal("vendedor"));

const usuarioPublico = v.object({
  _id: v.id("usuarios"),
  nombre: v.string(),
  email: v.string(),
  rol: rolValidator,
});

// ---------- Sesión / perfil ----------

export const actual = query({
  args: {},
  returns: v.union(v.null(), usuarioPublico),
  handler: async (ctx) => {
    const u = await resolverUsuario(ctx);
    if (!u) return null;
    return { _id: u._id, nombre: u.nombre, email: u.email, rol: u.rol };
  },
});

/**
 * Opciones para asignar responsable/propietario (cualquier sesión válida, NO solo dueña).
 * La usan los formularios de cliente (P5) para el select de Propietario — por eso NO puede ser
 * dueña-only como `listar`. Devuelve solo usuarios activos.
 */
export const opcionesAsignacion = query({
  args: {},
  returns: v.array(v.object({ _id: v.id("usuarios"), nombre: v.string() })),
  handler: async (ctx) => {
    await requireUsuario(ctx);
    const todos = await ctx.db.query("usuarios").collect();
    return todos
      .filter((u) => u.activo !== false)
      .map((u) => ({ _id: u._id, nombre: u.nombre }));
  },
});

// ---------- M2.3 · Gestión de equipo (DUEÑA-only) ----------

/** Lista el equipo activo. Solo dueña. `usuarios` es una tabla pequeña → `.collect()` es seguro. */
export const listar = query({
  args: {},
  returns: v.array(usuarioPublico),
  handler: async (ctx) => {
    await requireDuena(ctx);
    const todos = await ctx.db.query("usuarios").collect();
    return todos
      .filter((u) => u.activo !== false)
      .map((u) => ({ _id: u._id, nombre: u.nombre, email: u.email, rol: u.rol }));
  },
});

/**
 * Pre-validación del alta (dueña): normaliza email y CHEQUEA DUPLICADOS en ambas tablas
 * (`usuarios.por_email` + `authAccounts.providerAndAccountId`).
 *  - ambos existen → "ya existe".
 *  - estado PARCIAL (uno sí, otro no) → ABORTA con mensaje operativo (no crear otra cuenta Auth).
 *  - limpio → devuelve el email normalizado.
 */
export const _preAlta = internalQuery({
  args: { email: v.string() },
  returns: v.object({ email: v.string() }),
  handler: async (ctx, { email }) => {
    await requireDuena(ctx);
    const emailNorm = normalizarEmail(email);
    if (!emailNorm) throw new ConvexError("El email es obligatorio");

    const usuario = await ctx.db
      .query("usuarios")
      .withIndex("por_email", (q) => q.eq("email", emailNorm))
      .unique();
    const cuenta = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", emailNorm),
      )
      .unique();

    if (usuario && cuenta) throw new ConvexError(`Ya existe un usuario con el email ${emailNorm}`);
    if (usuario || cuenta) {
      throw new ConvexError(
        `Estado parcial para ${emailNorm}: existe ${usuario ? "perfil sin cuenta Auth" : "cuenta Auth sin perfil"}. Reconciliar antes de reintentar.`,
      );
    }
    return { email: emailNorm };
  },
});

/** Inserta el usuario de dominio enlazado a su identidad Auth. Revalida el conflicto (ventana). */
export const _enlazarAlta = internalMutation({
  args: {
    nombre: v.string(),
    email: v.string(),
    rol: rolValidator,
    authUserId: v.id("users"),
  },
  returns: v.id("usuarios"),
  handler: async (ctx, { nombre, email, rol, authUserId }) => {
    // Autoriza (y REVALIDA que la dueña sigue activa) también en el enlace, no solo en `_preAlta`.
    await requireDuena(ctx);
    const limpio = nombre.trim();
    if (!limpio) throw new ConvexError("El nombre es obligatorio");
    const existente = await ctx.db
      .query("usuarios")
      .withIndex("por_email", (q) => q.eq("email", email))
      .unique();
    if (existente) {
      throw new ConvexError(`Conflicto: ${email} fue creado en paralelo; abortando el enlace.`);
    }
    return await ctx.db.insert("usuarios", {
      nombre: limpio,
      email,
      rol,
      authId: authUserId,
      activo: true,
    });
  },
});

/**
 * Alta de usuario (dueña). Crea la credencial en Convex Auth (Password) con una contraseña
 * temporal y enlaza la fila de dominio. Requiere ActionCtx. Si `_enlazarAlta` falla tras
 * `createAccount`, el próximo intento lo detecta como estado parcial en `_preAlta` y aborta.
 */
export const crearUsuario = action({
  args: {
    nombre: v.string(),
    email: v.string(),
    rol: rolValidator,
    passwordTemporal: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { nombre, email, rol, passwordTemporal }) => {
    // Validar el nombre ANTES de tocar Convex Auth: no crear cuenta si el nombre es inválido.
    if (!nombre.trim()) throw new ConvexError("El nombre es obligatorio");
    if (passwordTemporal.length < 8) {
      throw new ConvexError("La contraseña temporal debe tener al menos 8 caracteres");
    }
    const { email: emailNorm } = await ctx.runQuery(internal.usuarios._preAlta, { email });
    const { user } = await createAccount<DataModel>(ctx, {
      provider: "password",
      account: { id: emailNorm, secret: passwordTemporal },
      profile: { email: emailNorm },
    });
    await ctx.runMutation(internal.usuarios._enlazarAlta, {
      nombre,
      email: emailNorm,
      rol,
      authUserId: user._id,
    });
    return null;
  },
});

/** Editar nombre y rol de un usuario (dueña). Email INMUTABLE. Invariante: ≥1 dueña activa. */
export const actualizar = mutation({
  args: { id: v.id("usuarios"), nombre: v.string(), rol: rolValidator },
  returns: v.null(),
  handler: async (ctx, { id, nombre, rol }) => {
    await requireDuena(ctx);
    const target = await ctx.db.get(id);
    if (!target || target.activo === false) throw new ConvexError("Usuario no encontrado");

    // No degradar a la ÚLTIMA dueña activa.
    if (target.rol === "duena" && rol !== "duena") {
      const duenas = (await ctx.db.query("usuarios").collect()).filter(
        (u) => u.rol === "duena" && u.activo !== false,
      );
      if (duenas.length <= 1) throw new ConvexError("Debe haber al menos una dueña");
    }
    const limpio = nombre.trim();
    if (!limpio) throw new ConvexError("El nombre es obligatorio");
    await ctx.db.patch(id, { nombre: limpio, rol });
    return null;
  },
});

/** Baja lógica (dueña): guards + `activo=false`. Devuelve el `authId` para invalidar sesiones. */
export const _desactivar = internalMutation({
  args: { id: v.id("usuarios") },
  returns: v.union(v.null(), v.id("users")),
  handler: async (ctx, { id }) => {
    const actor = await requireDuena(ctx);
    const target = await ctx.db.get(id);
    if (!target || target.activo === false) throw new ConvexError("Usuario no encontrado");
    if (target._id === actor._id) throw new ConvexError("No puedes desactivarte a ti misma");
    if (target.rol === "duena") {
      const duenas = (await ctx.db.query("usuarios").collect()).filter(
        (u) => u.rol === "duena" && u.activo !== false,
      );
      if (duenas.length <= 1) throw new ConvexError("Debe haber al menos una dueña");
    }
    await ctx.db.patch(id, { activo: false });
    return target.authId ?? null;
  },
});

/** Desactivar usuario (dueña) + invalidar sus sesiones de inmediato. Requiere ActionCtx. */
export const desactivarUsuario = action({
  args: { id: v.id("usuarios") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const authId = await ctx.runMutation(internal.usuarios._desactivar, { id });
    if (authId) await invalidateSessions<DataModel>(ctx, { userId: authId });
    return null;
  },
});

// ---------- M2.4 · Perfil propio ----------

/** Editar MI propio nombre (cualquier sesión). Nunca rol/email. */
export const actualizarPerfil = mutation({
  args: { nombre: v.string() },
  returns: v.null(),
  handler: async (ctx, { nombre }) => {
    const usuario = await requireUsuario(ctx);
    const limpio = nombre.trim();
    if (!limpio) throw new ConvexError("El nombre es obligatorio");
    await ctx.db.patch(usuario._id, { nombre: limpio });
    return null;
  },
});

/** Datos propios necesarios para el cambio de contraseña. */
export const _perfilParaPassword = internalQuery({
  args: {},
  returns: v.object({ email: v.string(), authId: v.id("users") }),
  handler: async (ctx) => {
    const usuario = await requireUsuario(ctx);
    if (!usuario.authId) throw new ConvexError("Tu cuenta no tiene identidad de acceso");
    return { email: usuario.email, authId: usuario.authId };
  },
});

/** Cambiar MI contraseña: verifica la actual, la cambia e invalida las demás sesiones. ActionCtx. */
export const cambiarPassword = action({
  args: { actual: v.string(), nueva: v.string() },
  returns: v.null(),
  handler: async (ctx, { actual, nueva }) => {
    if (nueva.length < 8) {
      throw new ConvexError("La nueva contraseña debe tener al menos 8 caracteres");
    }
    const perfil = await ctx.runQuery(internal.usuarios._perfilParaPassword, {});

    // Verifica la contraseña ACTUAL: retrieveAccount lanza si el secret no coincide.
    const cuenta = await retrieveAccount<DataModel>(ctx, {
      provider: "password",
      account: { id: perfil.email, secret: actual },
    }).catch(() => null);
    // Comparación CRÍTICA: la cuenta recuperada debe ser la de MI identidad.
    if (!cuenta || cuenta.user._id !== perfil.authId) {
      throw new ConvexError("La contraseña actual es incorrecta");
    }

    await modifyAccountCredentials<DataModel>(ctx, {
      provider: "password",
      account: { id: perfil.email, secret: nueva },
    });

    // Invalida las demás sesiones; conserva la actual si se puede identificar.
    const sid = await getAuthSessionId(ctx);
    await invalidateSessions<DataModel>(ctx, { userId: perfil.authId, except: sid ? [sid] : [] });
    return null;
  },
});
