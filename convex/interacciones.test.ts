import { describe, it, expect } from "vitest";
import { convexTest, type TestConvex } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

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

/** Cliente insertado directamente (para controlar `archivado`). */
async function cliente(
  t: TestConvex<typeof schema>,
  propietario: Id<"usuarios">,
  over: Record<string, unknown> = {},
) {
  return t.run((ctx) =>
    ctx.db.insert("clientes", {
      nombre: "Cliente", prioridad: "media", propietario, registrado_por: propietario, archivado: false, ...over,
    }),
  );
}

describe("interacciones · registrar", () => {
  it("inserta con registrado_por=yo y guarda tipo/canal/nota (recortada)/fecha", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    const cid = await cliente(t, ids.elena);
    const id = await as.mutation(api.interacciones.registrar, {
      cliente_id: cid, tipo: "mensaje", canal: "whatsapp", nota: "  Quedó en revisar  ", fecha: 1_700_000_000_000,
    });
    const doc = await t.run((ctx) => ctx.db.get(id));
    expect(doc!.registrado_por).toBe(ids.carlos);
    expect(doc!.tipo).toBe("mensaje");
    expect(doc!.canal).toBe("whatsapp");
    expect(doc!.nota).toBe("Quedó en revisar"); // recortada
    expect(doc!.fecha).toBe(1_700_000_000_000);
  });

  it("sin fecha → usa Date.now() del servidor (≈ ahora)", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    const cid = await cliente(t, ids.elena);
    const id = await as.mutation(api.interacciones.registrar, { cliente_id: cid, tipo: "llamada" });
    const doc = await t.run((ctx) => ctx.db.get(id));
    expect(Math.abs(doc!.fecha - Date.now())).toBeLessThan(10_000);
  });

  it("sin sesión → rechaza (requireUsuario)", async () => {
    const { t, ids } = await mundo();
    const cid = await cliente(t, ids.elena);
    await expect(t.mutation(api.interacciones.registrar, { cliente_id: cid, tipo: "llamada" })).rejects.toThrow();
  });

  it("cliente inexistente → rechaza", async () => {
    const { t, ids } = await mundo();
    const fantasma = await t.run(async (ctx) => {
      const c = await ctx.db.insert("clientes", {
        nombre: "Tmp", prioridad: "media", propietario: ids.elena, registrado_por: ids.elena, archivado: false,
      });
      await ctx.db.delete(c);
      return c;
    });
    const as = await como(t, "carlos@x.test");
    await expect(
      as.mutation(api.interacciones.registrar, { cliente_id: fantasma, tipo: "llamada" }),
    ).rejects.toThrow(/cliente/i);
  });

  it("cliente archivado → rechaza", async () => {
    const { t, ids } = await mundo();
    const cid = await cliente(t, ids.elena, { archivado: true });
    const as = await como(t, "carlos@x.test");
    await expect(
      as.mutation(api.interacciones.registrar, { cliente_id: cid, tipo: "llamada" }),
    ).rejects.toThrow(/cliente/i);
  });

  it("fecha futura → rechaza (fuera de la tolerancia de reloj)", async () => {
    const { t, ids } = await mundo();
    const cid = await cliente(t, ids.elena);
    const as = await como(t, "carlos@x.test");
    await expect(
      as.mutation(api.interacciones.registrar, { cliente_id: cid, tipo: "llamada", fecha: Date.now() + 10 * 60_000 }),
    ).rejects.toThrow(/fecha/i);
  });

  it("fecha inválida (≤ 0) → rechaza", async () => {
    const { t, ids } = await mundo();
    const cid = await cliente(t, ids.elena);
    const as = await como(t, "carlos@x.test");
    await expect(
      as.mutation(api.interacciones.registrar, { cliente_id: cid, tipo: "llamada", fecha: 0 }),
    ).rejects.toThrow(/fecha/i);
  });

  it("canal se descarta si el tipo no es 'mensaje' (visita/llamada → undefined)", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    const cid = await cliente(t, ids.elena);
    const idVisita = await as.mutation(api.interacciones.registrar, {
      cliente_id: cid, tipo: "visita", canal: "whatsapp",
    });
    const idLlamada = await as.mutation(api.interacciones.registrar, {
      cliente_id: cid, tipo: "llamada", canal: "email",
    });
    const visita = await t.run((ctx) => ctx.db.get(idVisita));
    const llamada = await t.run((ctx) => ctx.db.get(idLlamada));
    expect(visita!.canal).toBeUndefined();
    expect(llamada!.canal).toBeUndefined();
  });

  it("nota más larga que el máximo → rechaza", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    const cid = await cliente(t, ids.elena);
    await expect(
      as.mutation(api.interacciones.registrar, { cliente_id: cid, tipo: "llamada", nota: "a".repeat(2001) }),
    ).rejects.toThrow(/larga/i);
  });

  it("e2e: tras registrar, la ficha muestra la interacción y actualiza ultimoContacto", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    const cid = await cliente(t, ids.elena);
    await as.mutation(api.interacciones.registrar, { cliente_id: cid, tipo: "mensaje", canal: "whatsapp", nota: "Hola" });
    const ficha = await as.query(api.clientes.ficha, { id: cid });
    expect(ficha!.interacciones).toHaveLength(1);
    expect(ficha!.interacciones[0].nota).toBe("Hola");
    expect(ficha!.interacciones[0].autorNombre).toBe("Carlos");
    expect(ficha!.ultimoContacto).toBe(ficha!.interacciones[0].fecha);
    expect(ficha!.ultimoContacto).not.toBeNull();
  });
});
