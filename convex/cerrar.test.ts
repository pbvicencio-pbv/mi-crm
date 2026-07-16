import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

async function mundo() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const duena = await ctx.db.insert("usuarios", { nombre: "Elena", email: "elena@x.test", rol: "duena" });
    const vendedor = await ctx.db.insert("usuarios", { nombre: "Carlos", email: "carlos@x.test", rol: "vendedor" });
    const cliente = await ctx.db.insert("clientes", {
      nombre: "Laura",
      prioridad: "media",
      propietario: vendedor,
      registrado_por: vendedor,
      archivado: false,
    });
    const propio = await ctx.db.insert("seguimientos", {
      cliente_id: cliente,
      fecha_objetivo: 1,
      estado: "pendiente",
      responsable: vendedor,
    });
    const ajeno = await ctx.db.insert("seguimientos", {
      cliente_id: cliente,
      fecha_objetivo: 1,
      estado: "pendiente",
      responsable: duena,
    });
    return { cliente, vendedor, propio, ajeno };
  });
  return { t, ids };
}

describe("cerrar()", () => {
  it("el vendedor cierra el suyo; idempotente al repetir", async () => {
    const { t, ids } = await mundo();
    const as = t.withIdentity({ email: "carlos@x.test" });
    const r1 = await as.mutation(api.seguimientos.cerrar, { id: ids.propio });
    expect(r1).toEqual({ ok: true, yaCerrado: false });
    const r2 = await as.mutation(api.seguimientos.cerrar, { id: ids.propio });
    expect(r2).toEqual({ ok: true, yaCerrado: true }); // idempotente
  });

  it("el vendedor NO puede cerrar uno ajeno", async () => {
    const { t, ids } = await mundo();
    await expect(
      t.withIdentity({ email: "carlos@x.test" }).mutation(api.seguimientos.cerrar, { id: ids.ajeno }),
    ).rejects.toThrow();
  });

  it("la dueña puede cerrar cualquiera", async () => {
    const { t, ids } = await mundo();
    const r = await t
      .withIdentity({ email: "elena@x.test" })
      .mutation(api.seguimientos.cerrar, { id: ids.ajeno });
    expect(r.ok).toBe(true);
  });

  it("id inexistente → error", async () => {
    const { t } = await mundo();
    const idFantasma = await t.run(async (ctx) => {
      const tmp = await ctx.db.insert("seguimientos", {
        cliente_id: (await ctx.db.query("clientes").first())!._id,
        fecha_objetivo: 1,
        estado: "pendiente",
        responsable: (await ctx.db.query("usuarios").first())!._id,
      });
      await ctx.db.delete(tmp);
      return tmp as Id<"seguimientos">;
    });
    await expect(
      t.withIdentity({ email: "elena@x.test" }).mutation(api.seguimientos.cerrar, { id: idFantasma }),
    ).rejects.toThrow();
  });
});
