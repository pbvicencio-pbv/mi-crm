import { describe, it, expect } from "vitest";
import { convexTest, type TestConvex } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

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

/** Mundo con 1 dueña (Elena) + 1 vendedor (Carlos), ambos activos. */
async function mundo() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const elena = await ctx.db.insert("usuarios", { nombre: "Elena", email: "elena@x.test", rol: "duena", activo: true });
    const carlos = await ctx.db.insert("usuarios", { nombre: "Carlos", email: "carlos@x.test", rol: "vendedor", activo: true });
    return { elena, carlos };
  });
  return { t, ids };
}

describe("clientes · crearCliente", () => {
  it("crea con defaults (prioridad=media, propietario=yo, registrado_por=yo, archivado=false)", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    const id = await as.mutation(api.clientes.crearCliente, { nombre: "  Ana López  " });
    const c = await t.run((ctx) => ctx.db.get(id));
    expect(c).not.toBeNull();
    expect(c!.nombre).toBe("Ana López"); // recortado
    expect(c!.prioridad).toBe("media");
    expect(c!.propietario).toBe(ids.carlos);
    expect(c!.registrado_por).toBe(ids.carlos);
    expect(c!.archivado).toBe(false);
  });

  it("guarda todos los campos y permite asignar propietario a otro usuario activo", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    const id = await as.mutation(api.clientes.crearCliente, {
      nombre: "Beto", telefono: "+52 55 1", email: "beto@x.test", empresa: "ACME",
      cargo: "Compras", ciudad: "CDMX", canal: "whatsapp", origen: "recomendacion",
      notas: "Nota", prioridad: "alta", propietario: ids.elena,
    });
    const c = await t.run((ctx) => ctx.db.get(id));
    expect(c!.propietario).toBe(ids.elena);
    expect(c!.prioridad).toBe("alta");
    expect(c!.canal).toBe("whatsapp");
    expect(c!.origen).toBe("recomendacion");
    expect(c!.empresa).toBe("ACME");
  });

  it("nombre vacío → rechaza", async () => {
    const { t } = await mundo();
    const as = await como(t, "carlos@x.test");
    await expect(as.mutation(api.clientes.crearCliente, { nombre: "   " })).rejects.toThrow(/nombre/i);
  });

  it("sin sesión → rechaza (requireUsuario)", async () => {
    const { t } = await mundo();
    await expect(t.mutation(api.clientes.crearCliente, { nombre: "X" })).rejects.toThrow();
  });

  it("propietario inexistente → rechaza", async () => {
    const { t } = await mundo();
    // id con formato válido pero borrado → get() = null.
    const fantasma = await t.run(async (ctx) => {
      const uid = await ctx.db.insert("usuarios", { nombre: "Tmp", email: "tmp@x.test", rol: "vendedor", activo: true });
      await ctx.db.delete(uid);
      return uid;
    });
    const as = await como(t, "carlos@x.test");
    await expect(
      as.mutation(api.clientes.crearCliente, { nombre: "X", propietario: fantasma }),
    ).rejects.toThrow(/propietario/i);
  });

  it("propietario inactivo → rechaza", async () => {
    const { t } = await mundo();
    const inactivo = await t.run((ctx) =>
      ctx.db.insert("usuarios", { nombre: "Baja", email: "baja@x.test", rol: "vendedor", activo: false }),
    );
    const as = await como(t, "carlos@x.test");
    await expect(
      as.mutation(api.clientes.crearCliente, { nombre: "X", propietario: inactivo }),
    ).rejects.toThrow(/propietario/i);
  });
});

describe("clientes · actualizarCliente", () => {
  async function conCliente() {
    const { t, ids } = await mundo();
    const elena = await como(t, "elena@x.test");
    const id = await elena.mutation(api.clientes.crearCliente, { nombre: "Original", propietario: ids.elena });
    return { t, ids, id };
  }

  it("edita nombre/prioridad/propietario", async () => {
    const { t, ids, id } = await conCliente();
    const carlos = await como(t, "carlos@x.test");
    await carlos.mutation(api.clientes.actualizarCliente, {
      id, nombre: "Editado", prioridad: "baja", propietario: ids.carlos,
    });
    const c = await t.run((ctx) => ctx.db.get(id));
    expect(c!.nombre).toBe("Editado");
    expect(c!.prioridad).toBe("baja");
    expect(c!.propietario).toBe(ids.carlos);
  });

  it("NO toca archivado ni registrado_por", async () => {
    const { t, ids, id } = await conCliente(); // registrado_por = Elena, archivado = false
    const carlos = await como(t, "carlos@x.test");
    await carlos.mutation(api.clientes.actualizarCliente, {
      id, nombre: "Editado", prioridad: "media", propietario: ids.carlos,
    });
    const c = await t.run((ctx) => ctx.db.get(id));
    expect(c!.registrado_por).toBe(ids.elena); // intacto
    expect(c!.archivado).toBe(false); // intacto
  });

  it("cliente inexistente → rechaza", async () => {
    const { t, ids, id } = await conCliente();
    await t.run((ctx) => ctx.db.delete(id));
    const carlos = await como(t, "carlos@x.test");
    await expect(
      carlos.mutation(api.clientes.actualizarCliente, { id, nombre: "X", prioridad: "media", propietario: ids.carlos }),
    ).rejects.toThrow(/no encontrado/i);
  });

  it("cliente archivado → rechaza", async () => {
    const { t, ids, id } = await conCliente();
    await t.run((ctx) => ctx.db.patch(id, { archivado: true }));
    const carlos = await como(t, "carlos@x.test");
    await expect(
      carlos.mutation(api.clientes.actualizarCliente, { id, nombre: "X", prioridad: "media", propietario: ids.carlos }),
    ).rejects.toThrow(/no encontrado/i);
  });

  it("propietario inactivo → rechaza", async () => {
    const { t, id } = await conCliente();
    const inactivo = await t.run((ctx) =>
      ctx.db.insert("usuarios", { nombre: "Baja", email: "baja@x.test", rol: "vendedor", activo: false }),
    );
    const carlos = await como(t, "carlos@x.test");
    await expect(
      carlos.mutation(api.clientes.actualizarCliente, { id, nombre: "X", prioridad: "media", propietario: inactivo }),
    ).rejects.toThrow(/propietario/i);
  });
});

describe("clientes · obtener", () => {
  it("devuelve el cliente crudo; null si archivado", async () => {
    const { t, ids } = await mundo();
    const elena = await como(t, "elena@x.test");
    const id = await elena.mutation(api.clientes.crearCliente, { nombre: "Ficha", propietario: ids.elena });
    const ok = await elena.query(api.clientes.obtener, { id });
    expect(ok?.nombre).toBe("Ficha");
    await t.run((ctx) => ctx.db.patch(id, { archivado: true }));
    const archivado = await elena.query(api.clientes.obtener, { id });
    expect(archivado).toBeNull();
  });

  it("sin sesión → rechaza", async () => {
    const { t, ids } = await mundo();
    const elena = await como(t, "elena@x.test");
    const id = await elena.mutation(api.clientes.crearCliente, { nombre: "X", propietario: ids.elena });
    await expect(t.query(api.clientes.obtener, { id })).rejects.toThrow();
  });
});

describe("usuarios · opcionesAsignacion", () => {
  it("lista activos, excluye inactivos, y la puede llamar un vendedor", async () => {
    const { t } = await mundo();
    await t.run((ctx) =>
      ctx.db.insert("usuarios", { nombre: "Baja", email: "baja@x.test", rol: "vendedor", activo: false }),
    );
    const carlos = await como(t, "carlos@x.test");
    const ops = await carlos.query(api.usuarios.opcionesAsignacion, {});
    const nombres = ops.map((o) => o.nombre).sort();
    expect(nombres).toEqual(["Carlos", "Elena"]); // "Baja" (inactivo) fuera
  });
});
