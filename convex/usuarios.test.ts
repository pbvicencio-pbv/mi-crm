import { describe, it, expect } from "vitest";
import { convexTest, type TestConvex } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { resolverUsuario } from "./lib/auth";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

/** Autentica como el usuario de dominio con ese email (enlaza users._id ↔ usuarios.authId). */
async function como(t: TestConvex<typeof schema>, email: string) {
  const authId = await t.run(async (ctx) => {
    const u = await ctx.db
      .query("usuarios")
      .withIndex("por_email", (q) => q.eq("email", email))
      .unique();
    if (!u) throw new Error(`usuarios no encontrado: ${email}`);
    if (u.authId) return u.authId;
    const id = await ctx.db.insert("users", { email });
    await ctx.db.patch(u._id, { authId: id });
    return id;
  });
  return t.withIdentity({ subject: `${authId}|s` });
}

/** Mundo con 2 dueñas (Elena, Marta) + 1 vendedor (Carlos), todos activos. */
async function mundo() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const elena = await ctx.db.insert("usuarios", { nombre: "Elena", email: "elena@x.test", rol: "duena", activo: true });
    const marta = await ctx.db.insert("usuarios", { nombre: "Marta", email: "marta@x.test", rol: "duena", activo: true });
    const carlos = await ctx.db.insert("usuarios", { nombre: "Carlos", email: "carlos@x.test", rol: "vendedor", activo: true });
    return { elena, marta, carlos };
  });
  return { t, ids };
}

describe("usuarios · listar (dueña-only, solo activos)", () => {
  it("vendedor NO puede listar", async () => {
    const { t } = await mundo();
    const as = await como(t, "carlos@x.test");
    await expect(as.query(api.usuarios.listar, {})).rejects.toThrow();
  });

  it("dueña lista y excluye a los inactivos", async () => {
    const { t, ids } = await mundo();
    await t.run((ctx) => ctx.db.patch(ids.carlos, { activo: false })); // baja lógica
    const as = await como(t, "elena@x.test");
    const lista = await as.query(api.usuarios.listar, {});
    const emails = lista.map((u) => u.email).sort();
    expect(emails).toEqual(["elena@x.test", "marta@x.test"]); // Carlos (inactivo) fuera
  });
});

describe("usuarios · actualizar (dueña-only, ≥1 dueña)", () => {
  it("vendedor NO puede actualizar", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    await expect(
      as.mutation(api.usuarios.actualizar, { id: ids.marta, nombre: "X", rol: "vendedor" }),
    ).rejects.toThrow();
  });

  it("dueña degrada a otra dueña cuando hay 2 → OK", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "elena@x.test");
    await as.mutation(api.usuarios.actualizar, { id: ids.marta, nombre: "Marta", rol: "vendedor" });
    const rol = await t.run(async (ctx) => (await ctx.db.get(ids.marta))!.rol);
    expect(rol).toBe("vendedor");
  });

  it("NO se puede degradar a la ÚLTIMA dueña activa", async () => {
    const { t, ids } = await mundo();
    // Deja a Elena como única dueña activa.
    await t.run((ctx) => ctx.db.patch(ids.marta, { rol: "vendedor" }));
    const as = await como(t, "elena@x.test");
    await expect(
      as.mutation(api.usuarios.actualizar, { id: ids.elena, nombre: "Elena", rol: "vendedor" }),
    ).rejects.toThrow(/al menos una dueña/i);
  });

  it("nombre vacío → error", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "elena@x.test");
    await expect(
      as.mutation(api.usuarios.actualizar, { id: ids.carlos, nombre: "   ", rol: "vendedor" }),
    ).rejects.toThrow();
  });
});

describe("usuarios · _desactivar (no auto-baja, ≥1 dueña, dueña-only)", () => {
  it("dueña desactiva a un vendedor → OK", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "elena@x.test");
    await as.mutation(internal.usuarios._desactivar, { id: ids.carlos });
    const activo = await t.run(async (ctx) => (await ctx.db.get(ids.carlos))!.activo);
    expect(activo).toBe(false);
  });

  it("nadie se desactiva a sí misma", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "elena@x.test");
    await expect(
      as.mutation(internal.usuarios._desactivar, { id: ids.elena }),
    ).rejects.toThrow(/ti misma/i);
  });

  it("NO se puede desactivar a la última dueña activa", async () => {
    const { t, ids } = await mundo();
    await t.run((ctx) => ctx.db.patch(ids.marta, { rol: "vendedor" })); // Elena única dueña
    const as = await como(t, "marta@x.test"); // Marta (ya vendedora) intenta... será rechazada por dueña-only
    await expect(
      as.mutation(internal.usuarios._desactivar, { id: ids.elena }),
    ).rejects.toThrow(); // no-dueña → rechazado
  });

  it("vendedor NO puede desactivar", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    await expect(
      as.mutation(internal.usuarios._desactivar, { id: ids.marta }),
    ).rejects.toThrow();
  });
});

describe("usuarios · _preAlta (dueña-only, duplicados, estado parcial)", () => {
  it("dueña + email limpio → normaliza y devuelve", async () => {
    const { t } = await mundo();
    const as = await como(t, "elena@x.test");
    const r = await as.query(internal.usuarios._preAlta, { email: "  Nuevo@X.test " });
    expect(r.email).toBe("nuevo@x.test");
  });

  it("email ya existente (perfil + cuenta) → 'ya existe'", async () => {
    const { t } = await mundo();
    await t.run(async (ctx) => {
      const uid = await ctx.db.insert("users", { email: "dup@x.test" });
      await ctx.db.insert("authAccounts", { userId: uid, provider: "password", providerAccountId: "dup@x.test" });
      await ctx.db.insert("usuarios", { nombre: "Dup", email: "dup@x.test", rol: "vendedor", authId: uid, activo: true });
    });
    const as = await como(t, "elena@x.test");
    await expect(
      as.query(internal.usuarios._preAlta, { email: "dup@x.test" }),
    ).rejects.toThrow(/ya existe/i);
  });

  it("estado PARCIAL (perfil sin cuenta Auth) → aborta", async () => {
    const { t } = await mundo();
    await t.run((ctx) =>
      ctx.db.insert("usuarios", { nombre: "P", email: "parcial@x.test", rol: "vendedor", activo: true }),
    );
    const as = await como(t, "elena@x.test");
    await expect(
      as.query(internal.usuarios._preAlta, { email: "parcial@x.test" }),
    ).rejects.toThrow(/parcial/i);
  });

  it("vendedor NO puede pre-validar alta", async () => {
    const { t } = await mundo();
    const as = await como(t, "carlos@x.test");
    await expect(
      as.query(internal.usuarios._preAlta, { email: "otro@x.test" }),
    ).rejects.toThrow();
  });
});

describe("usuarios · actualizarPerfil (solo nombre propio)", () => {
  it("actualiza mi propio nombre", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    await as.mutation(api.usuarios.actualizarPerfil, { nombre: "Carlos M." });
    const nombre = await t.run(async (ctx) => (await ctx.db.get(ids.carlos))!.nombre);
    expect(nombre).toBe("Carlos M.");
  });

  it("nombre vacío → error", async () => {
    const { t } = await mundo();
    const as = await como(t, "carlos@x.test");
    await expect(as.mutation(api.usuarios.actualizarPerfil, { nombre: "  " })).rejects.toThrow();
  });
});

describe("resolverUsuario · inactivo se trata como sin usuario", () => {
  it("identidad presente + usuario activo:false → null", async () => {
    const t = convexTest(schema, modules);
    const authId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("users", { email: "baja@x.test" });
      await ctx.db.insert("usuarios", { nombre: "Baja", email: "baja@x.test", rol: "vendedor", authId: id, activo: false });
      return id;
    });
    const u = await t.withIdentity({ subject: `${authId}|s` }).run((ctx) => resolverUsuario(ctx));
    expect(u).toBeNull();
  });
});

describe("usuarios · crearUsuario (action pública, dueña-only)", () => {
  it("vendedor NO puede crear usuarios", async () => {
    const { t } = await mundo();
    const as = await como(t, "carlos@x.test");
    await expect(
      as.action(api.usuarios.crearUsuario, {
        nombre: "Nuevo", email: "nuevo@x.test", rol: "vendedor", passwordTemporal: "temporal123",
      }),
    ).rejects.toThrow();
  });

  it("dueña crea un usuario y aparece en listar", async () => {
    const { t } = await mundo();
    const as = await como(t, "elena@x.test");
    await as.action(api.usuarios.crearUsuario, {
      nombre: "Nueva Persona", email: "nueva@x.test", rol: "vendedor", passwordTemporal: "temporal123",
    });
    const lista = await as.query(api.usuarios.listar, {});
    expect(lista.some((u) => u.email === "nueva@x.test")).toBe(true);
  });

  it("contraseña temporal corta → error (antes de tocar Auth)", async () => {
    const { t } = await mundo();
    const as = await como(t, "elena@x.test");
    await expect(
      as.action(api.usuarios.crearUsuario, {
        nombre: "X", email: "corta@x.test", rol: "vendedor", passwordTemporal: "123",
      }),
    ).rejects.toThrow(/8 caracteres/i);
  });

  it("nombre en blanco → error (sin tocar Auth)", async () => {
    const { t } = await mundo();
    const as = await como(t, "elena@x.test");
    await expect(
      as.action(api.usuarios.crearUsuario, {
        nombre: "   ", email: "blanco@x.test", rol: "vendedor", passwordTemporal: "temporal123",
      }),
    ).rejects.toThrow(/nombre/i);
  });
});

describe("usuarios · desactivarUsuario (action pública, dueña-only)", () => {
  it("vendedor NO puede desactivar", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    await expect(as.action(api.usuarios.desactivarUsuario, { id: ids.marta })).rejects.toThrow();
  });

  it("dueña desactiva a un vendedor", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "elena@x.test");
    await as.action(api.usuarios.desactivarUsuario, { id: ids.carlos });
    const activo = await t.run(async (ctx) => (await ctx.db.get(ids.carlos))!.activo);
    expect(activo).toBe(false);
  });
});

describe("usuarios · cambiarPassword (action, verifica la actual)", () => {
  it("actual incorrecta → error; actual correcta → OK", async () => {
    const { t } = await mundo();
    const admin = await como(t, "elena@x.test");
    await admin.action(api.usuarios.crearUsuario, {
      nombre: "Pass User", email: "pass@x.test", rol: "vendedor", passwordTemporal: "actual12345",
    });
    // Identidad SIN parte de sesión → getAuthSessionId=null → invalidateSessions({except:[]}).
    // (En runtime real hay una sesión válida; convex-test rechaza el id de sesión sintético "s".)
    const passAuthId = await t.run(async (ctx) => {
      const u = await ctx.db
        .query("usuarios")
        .withIndex("por_email", (q) => q.eq("email", "pass@x.test"))
        .unique();
      return u!.authId!;
    });
    const yo = t.withIdentity({ subject: `${passAuthId}` });
    await expect(
      yo.action(api.usuarios.cambiarPassword, { actual: "incorrecta999", nueva: "nueva12345" }),
    ).rejects.toThrow(/actual es incorrecta/i);
    await expect(
      yo.action(api.usuarios.cambiarPassword, { actual: "actual12345", nueva: "nueva12345" }),
    ).resolves.toBeNull();
  });
});
