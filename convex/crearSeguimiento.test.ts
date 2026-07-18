import { describe, it, expect } from "vitest";
import { convexTest, type TestConvex } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

const DIA = 24 * 60 * 60 * 1000;

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

async function mundo() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const elena = await ctx.db.insert("usuarios", { nombre: "Elena", email: "elena@x.test", rol: "duena", activo: true });
    const carlos = await ctx.db.insert("usuarios", { nombre: "Carlos", email: "carlos@x.test", rol: "vendedor", activo: true });
    return { elena, carlos };
  });
  return { t, ids };
}

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

describe("seguimientos · crearSeguimiento", () => {
  it("inserta con responsable=yo, estado='pendiente' y motivo recortado", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    const cid = await cliente(t, ids.elena);
    const fecha = Date.now() + 3 * DIA;
    const id = await as.mutation(api.seguimientos.crearSeguimiento, {
      cliente_id: cid, fecha_objetivo: fecha, motivo: "  Cerrar el plan anual  ",
    });
    const doc = await t.run((ctx) => ctx.db.get(id));
    expect(doc!.responsable).toBe(ids.carlos);
    expect(doc!.estado).toBe("pendiente");
    expect(doc!.fecha_objetivo).toBe(fecha);
    expect(doc!.motivo).toBe("Cerrar el plan anual");
    expect(doc!.fecha_cierre).toBeUndefined();
  });

  it("motivo es opcional (se guarda sin motivo)", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    const cid = await cliente(t, ids.elena);
    const id = await as.mutation(api.seguimientos.crearSeguimiento, {
      cliente_id: cid, fecha_objetivo: Date.now() + DIA,
    });
    const doc = await t.run((ctx) => ctx.db.get(id));
    expect(doc!.motivo).toBeUndefined();
  });

  it("sin sesión → rechaza", async () => {
    const { t, ids } = await mundo();
    const cid = await cliente(t, ids.elena);
    await expect(
      t.mutation(api.seguimientos.crearSeguimiento, { cliente_id: cid, fecha_objetivo: Date.now() + DIA }),
    ).rejects.toThrow();
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
      as.mutation(api.seguimientos.crearSeguimiento, { cliente_id: fantasma, fecha_objetivo: Date.now() + DIA }),
    ).rejects.toThrow(/cliente/i);
  });

  it("cliente archivado → rechaza", async () => {
    const { t, ids } = await mundo();
    const cid = await cliente(t, ids.elena, { archivado: true });
    const as = await como(t, "carlos@x.test");
    await expect(
      as.mutation(api.seguimientos.crearSeguimiento, { cliente_id: cid, fecha_objetivo: Date.now() + DIA }),
    ).rejects.toThrow(/cliente/i);
  });

  it("fecha_objetivo ≤ 0 → rechaza", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    const cid = await cliente(t, ids.elena);
    await expect(
      as.mutation(api.seguimientos.crearSeguimiento, { cliente_id: cid, fecha_objetivo: 0 }),
    ).rejects.toThrow(/fecha/i);
  });

  it("fecha_objetivo = Number.MAX_SAFE_INTEGER → rechaza (no representable por Date / fuera de techo)", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    const cid = await cliente(t, ids.elena);
    await expect(
      as.mutation(api.seguimientos.crearSeguimiento, { cliente_id: cid, fecha_objetivo: Number.MAX_SAFE_INTEGER }),
    ).rejects.toThrow(/fecha/i);
  });

  it("fecha_objetivo demasiado lejana (> ~5 años) → rechaza", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    const cid = await cliente(t, ids.elena);
    await expect(
      as.mutation(api.seguimientos.crearSeguimiento, { cliente_id: cid, fecha_objetivo: Date.now() + 6 * 365 * DIA }),
    ).rejects.toThrow(/fecha/i);
  });

  it("motivo más largo que el máximo → rechaza", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    const cid = await cliente(t, ids.elena);
    await expect(
      as.mutation(api.seguimientos.crearSeguimiento, {
        cliente_id: cid, fecha_objetivo: Date.now() + DIA, motivo: "a".repeat(2001),
      }),
    ).rejects.toThrow(/motivo/i);
  });

  it("e2e: tras programar, la ficha muestra proximoSeguimiento (el pendiente más próximo)", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    const cid = await cliente(t, ids.elena);
    const lejos = Date.now() + 10 * DIA;
    const cerca = Date.now() + 2 * DIA;
    await as.mutation(api.seguimientos.crearSeguimiento, { cliente_id: cid, fecha_objetivo: lejos, motivo: "Lejano" });
    await as.mutation(api.seguimientos.crearSeguimiento, { cliente_id: cid, fecha_objetivo: cerca, motivo: "Cercano" });
    const ficha = await as.query(api.clientes.ficha, { id: cid });
    expect(ficha!.proximoSeguimiento).not.toBeNull();
    expect(ficha!.proximoSeguimiento!.fechaObjetivo).toBe(cerca);
    expect(ficha!.proximoSeguimiento!.motivo).toBe("Cercano");
  });
});
