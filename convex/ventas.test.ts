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

/** Inserta una venta directamente (control fino para los tests de listar/actualizar/archivar). */
async function insertVenta(
  t: TestConvex<typeof schema>,
  o: {
    cliente: string; vendedor: string; estado?: "abierta" | "ganada" | "perdida";
    importe?: number; cantidad?: number; fecha?: number; archivado?: boolean;
  },
) {
  return t.run((ctx) =>
    ctx.db.insert("ventas", {
      cliente_id: o.cliente as never, producto: "P", importe: o.importe ?? 100, cantidad: o.cantidad ?? 1,
      estado: o.estado ?? "abierta", fecha: o.fecha ?? 1, vendedor: o.vendedor as never,
      registrado_por: o.vendedor as never, archivado: o.archivado ?? false,
    }),
  );
}

describe("ventas · listar", () => {
  it("CASCADA: una venta activa de un cliente archivado NO aparece", async () => {
    const { t, ids } = await mundo();
    const clienteB = await t.run((ctx) =>
      ctx.db.insert("clientes", {
        nombre: "Beta", prioridad: "media", propietario: ids.elena, registrado_por: ids.elena, archivado: true,
      }),
    );
    await insertVenta(t, { cliente: ids.cliente, vendedor: ids.carlos, importe: 100, cantidad: 2 }); // activa
    await insertVenta(t, { cliente: clienteB, vendedor: ids.carlos }); // cliente archivado → oculta
    const filas = await (await como(t, "elena@x.test")).query(api.ventas.listar, {});
    expect(filas).toHaveLength(1);
    expect(filas[0].total).toBe(200); // importe*cantidad
    expect(filas[0].clienteNombre).toBe("Laura");
    expect(filas[0].vendedorNombre).toBe("Carlos");
    expect(filas[0].vendedor).toBe(ids.carlos);
  });

  it("excluye ventas archivadas y ordena por fecha desc", async () => {
    const { t, ids } = await mundo();
    await insertVenta(t, { cliente: ids.cliente, vendedor: ids.carlos, fecha: 100 });
    await insertVenta(t, { cliente: ids.cliente, vendedor: ids.carlos, fecha: 300 });
    await insertVenta(t, { cliente: ids.cliente, vendedor: ids.carlos, fecha: 200 });
    await insertVenta(t, { cliente: ids.cliente, vendedor: ids.carlos, fecha: 999, archivado: true });
    const filas = await (await como(t, "carlos@x.test")).query(api.ventas.listar, {});
    expect(filas.map((f) => f.fecha)).toEqual([300, 200, 100]);
  });

  it("sin sesión → rechaza", async () => {
    const { t } = await mundo();
    await expect(t.query(api.ventas.listar, {})).rejects.toThrow();
  });
});

describe("ventas · actualizarVenta", () => {
  const args = (id: string, over: Record<string, unknown> = {}) => ({
    id: id as never, producto: "Editado", importe: 50, cantidad: 2, estado: "ganada" as const, vendedor: undefined as never, ...over,
  });

  it("la dueña edita cualquier venta (producto/importe/estado)", async () => {
    const { t, ids } = await mundo();
    const vid = await insertVenta(t, { cliente: ids.cliente, vendedor: ids.carlos });
    const as = await como(t, "elena@x.test");
    await as.mutation(api.ventas.actualizarVenta, args(vid, { vendedor: ids.carlos }));
    const vta = await t.run((ctx) => ctx.db.get(vid));
    expect(vta!.producto).toBe("Editado");
    expect(vta!.estado).toBe("ganada");
    expect(vta!.cantidad).toBe(2);
  });

  it("un vendedor NO puede editar una venta ajena (D1)", async () => {
    const { t, ids } = await mundo();
    const vid = await insertVenta(t, { cliente: ids.cliente, vendedor: ids.elena }); // de la dueña
    const as = await como(t, "carlos@x.test");
    await expect(
      as.mutation(api.ventas.actualizarVenta, args(vid, { vendedor: ids.carlos })),
    ).rejects.toThrow(/autorizado/i);
  });

  it("un vendedor SÍ edita la suya", async () => {
    const { t, ids } = await mundo();
    const vid = await insertVenta(t, { cliente: ids.cliente, vendedor: ids.carlos });
    const as = await como(t, "carlos@x.test");
    await as.mutation(api.ventas.actualizarVenta, args(vid, { vendedor: ids.carlos }));
    expect((await t.run((ctx) => ctx.db.get(vid)))!.producto).toBe("Editado");
  });

  it("rechaza venta archivada (M2)", async () => {
    const { t, ids } = await mundo();
    const vid = await insertVenta(t, { cliente: ids.cliente, vendedor: ids.carlos, archivado: true });
    const as = await como(t, "elena@x.test");
    await expect(
      as.mutation(api.ventas.actualizarVenta, args(vid, { vendedor: ids.carlos })),
    ).rejects.toThrow(/venta no encontrada/i);
  });

  it("rechaza si el cliente está archivado (M2)", async () => {
    const { t, ids } = await mundo();
    const vid = await insertVenta(t, { cliente: ids.cliente, vendedor: ids.carlos });
    await t.run((ctx) => ctx.db.patch(ids.cliente, { archivado: true }));
    const as = await como(t, "elena@x.test");
    await expect(
      as.mutation(api.ventas.actualizarVenta, args(vid, { vendedor: ids.carlos })),
    ).rejects.toThrow(/cliente no encontrado/i);
  });
});

describe("ventas · archivarVenta", () => {
  it("la dueña archiva; idempotente al repetir", async () => {
    const { t, ids } = await mundo();
    const vid = await insertVenta(t, { cliente: ids.cliente, vendedor: ids.carlos });
    const as = await como(t, "elena@x.test");
    expect(await as.mutation(api.ventas.archivarVenta, { id: vid })).toEqual({ ok: true, yaArchivado: false });
    expect(await as.mutation(api.ventas.archivarVenta, { id: vid })).toEqual({ ok: true, yaArchivado: true });
  });

  it("un vendedor NO puede archivar una venta ajena (D1)", async () => {
    const { t, ids } = await mundo();
    const vid = await insertVenta(t, { cliente: ids.cliente, vendedor: ids.elena });
    const as = await como(t, "carlos@x.test");
    await expect(as.mutation(api.ventas.archivarVenta, { id: vid })).rejects.toThrow(/autorizado/i);
  });

  it("authz ANTES de idempotencia: vendedor ajeno sobre venta YA archivada → rechaza (no yaArchivado)", async () => {
    const { t, ids } = await mundo();
    const vid = await insertVenta(t, { cliente: ids.cliente, vendedor: ids.elena, archivado: true });
    const as = await como(t, "carlos@x.test");
    await expect(as.mutation(api.ventas.archivarVenta, { id: vid })).rejects.toThrow(/autorizado/i);
  });

  it("venta inexistente → rechaza", async () => {
    const { t, ids } = await mundo();
    const vid = await insertVenta(t, { cliente: ids.cliente, vendedor: ids.carlos });
    await t.run((ctx) => ctx.db.delete(vid));
    const as = await como(t, "elena@x.test");
    await expect(as.mutation(api.ventas.archivarVenta, { id: vid })).rejects.toThrow(/no encontrada/i);
  });
});
