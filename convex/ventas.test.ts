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

/** Mundo con dueña (Elena) + vendedor (Carlos) + un cliente activo de Elena. */
async function mundo() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const elena = await ctx.db.insert("usuarios", { nombre: "Elena", email: "elena@x.test", rol: "duena", activo: true });
    const carlos = await ctx.db.insert("usuarios", { nombre: "Carlos", email: "carlos@x.test", rol: "vendedor", activo: true });
    const cliente = await ctx.db.insert("clientes", {
      nombre: "Laura", prioridad: "media", propietario: elena, registrado_por: elena, archivado: false,
    });
    return { elena, carlos, cliente };
  });
  return { t, ids };
}

describe("ventas · crearVenta", () => {
  it("crea con defaults (estado abierta, vendedor=yo, archivado false, sin total persistido)", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    const antes = Date.now();
    const id = await as.mutation(api.ventas.crearVenta, {
      cliente_id: ids.cliente, producto: "  Curso  ", importe: 1200.5, cantidad: 1,
    });
    const vta = await t.run((ctx) => ctx.db.get(id));
    expect(vta!.producto).toBe("Curso"); // recortado
    expect(vta!.estado).toBe("abierta");
    expect(vta!.vendedor).toBe(ids.carlos);
    expect(vta!.registrado_por).toBe(ids.carlos);
    expect(vta!.archivado).toBe(false);
    expect(vta!.fecha).toBeGreaterThanOrEqual(antes);
    expect((vta as unknown as { total?: number }).total).toBeUndefined(); // derivado, no persiste
  });

  it("guarda todos los campos; la dueña puede asignar otro vendedor y fecha pasada", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "elena@x.test");
    const ayer = Date.now() - 86_400_000;
    const id = await as.mutation(api.ventas.crearVenta, {
      cliente_id: ids.cliente, producto: "Plan Pro", importe: 500, cantidad: 3,
      estado: "ganada", fecha: ayer, vendedor: ids.carlos,
    });
    const vta = await t.run((ctx) => ctx.db.get(id));
    expect(vta!.estado).toBe("ganada");
    expect(vta!.cantidad).toBe(3);
    expect(vta!.vendedor).toBe(ids.carlos);
    expect(vta!.fecha).toBe(ayer);
  });

  it("recalcula el estado/valor derivado del cliente (ganada → ganado; valor = importe*cantidad)", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "elena@x.test");
    await as.mutation(api.ventas.crearVenta, {
      cliente_id: ids.cliente, producto: "P", importe: 100, cantidad: 4, estado: "ganada",
    });
    const ficha = await as.query(api.clientes.ficha, { id: ids.cliente });
    expect(ficha!.estado).toBe("ganado");
    expect(ficha!.valor).toBe(400);
    expect(ficha!.ventas[0].total).toBe(400);
  });

  it("producto vacío → rechaza", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    await expect(
      as.mutation(api.ventas.crearVenta, { cliente_id: ids.cliente, producto: "   ", importe: 10, cantidad: 1 }),
    ).rejects.toThrow(/producto/i);
  });

  it("importe inválido (0, negativo, no finito, > tope) → rechaza", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    for (const importe of [0, -5, Infinity, Number.NaN, 2_000_000_000]) {
      await expect(
        as.mutation(api.ventas.crearVenta, { cliente_id: ids.cliente, producto: "P", importe, cantidad: 1 }),
      ).rejects.toThrow(/importe/i);
    }
  });

  it("cantidad inválida (0, no entera, > tope) → rechaza", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    for (const cantidad of [0, 1.5, 200_000]) {
      await expect(
        as.mutation(api.ventas.crearVenta, { cliente_id: ids.cliente, producto: "P", importe: 10, cantidad }),
      ).rejects.toThrow(/cantidad/i);
    }
  });

  it("fecha futura (más de 5 min) → rechaza", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    await expect(
      as.mutation(api.ventas.crearVenta, {
        cliente_id: ids.cliente, producto: "P", importe: 10, cantidad: 1, fecha: Date.now() + 10 * 60 * 1000,
      }),
    ).rejects.toThrow(/fecha/i);
  });

  it("cliente inexistente o archivado → rechaza", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    const fantasma = await t.run(async (ctx) => {
      const c = await ctx.db.insert("clientes", {
        nombre: "Tmp", prioridad: "media", propietario: ids.elena, registrado_por: ids.elena, archivado: false,
      });
      await ctx.db.delete(c);
      return c;
    });
    await expect(
      as.mutation(api.ventas.crearVenta, { cliente_id: fantasma, producto: "P", importe: 10, cantidad: 1 }),
    ).rejects.toThrow(/cliente/i);
    await t.run((ctx) => ctx.db.patch(ids.cliente, { archivado: true }));
    await expect(
      as.mutation(api.ventas.crearVenta, { cliente_id: ids.cliente, producto: "P", importe: 10, cantidad: 1 }),
    ).rejects.toThrow(/cliente/i);
  });

  it("sin sesión → rechaza", async () => {
    const { t, ids } = await mundo();
    await expect(
      t.mutation(api.ventas.crearVenta, { cliente_id: ids.cliente, producto: "P", importe: 10, cantidad: 1 }),
    ).rejects.toThrow();
  });

  // --- D1: autorización por responsabilidad ---
  it("un vendedor NO puede registrar a nombre de OTRO vendedor (D1)", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    await expect(
      as.mutation(api.ventas.crearVenta, {
        cliente_id: ids.cliente, producto: "P", importe: 10, cantidad: 1, vendedor: ids.elena,
      }),
    ).rejects.toThrow(/a su nombre/i);
  });

  it("un vendedor SÍ puede registrar con vendedor = sí mismo", async () => {
    const { t, ids } = await mundo();
    const as = await como(t, "carlos@x.test");
    const id = await as.mutation(api.ventas.crearVenta, {
      cliente_id: ids.cliente, producto: "P", importe: 10, cantidad: 1, vendedor: ids.carlos,
    });
    expect(await t.run((ctx) => ctx.db.get(id))).not.toBeNull();
  });

  it("la dueña asignando un vendedor inactivo → rechaza", async () => {
    const { t, ids } = await mundo();
    const inactivo = await t.run((ctx) =>
      ctx.db.insert("usuarios", { nombre: "Baja", email: "baja@x.test", rol: "vendedor", activo: false }),
    );
    const as = await como(t, "elena@x.test");
    await expect(
      as.mutation(api.ventas.crearVenta, {
        cliente_id: ids.cliente, producto: "P", importe: 10, cantidad: 1, vendedor: inactivo,
      }),
    ).rejects.toThrow(/vendedor/i);
  });
});
