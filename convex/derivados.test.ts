import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { decidirEstado, derivarEstadoCliente, derivarValorCliente } from "./lib/derivados";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

describe("decidirEstado (puro)", () => {
  it("precedencia ganada > abierta > perdida > sin ventas", () => {
    expect(decidirEstado({ ganada: true, abierta: true, alguna: true })).toBe("ganado");
    expect(decidirEstado({ ganada: false, abierta: true, alguna: true })).toBe("en_negociacion");
    expect(decidirEstado({ ganada: false, abierta: false, alguna: true })).toBe("perdido");
    expect(decidirEstado({ ganada: false, abierta: false, alguna: false })).toBe("nuevo_lead");
  });
});

type VentaSpec = { estado: "ganada" | "abierta" | "perdida"; archivado: boolean };

async function estadoConVentas(ventas: VentaSpec[]) {
  const t = convexTest(schema, modules);
  return await t.run(async (ctx) => {
    const uid = await ctx.db.insert("usuarios", { nombre: "U", email: "u@x.test", rol: "vendedor" });
    const cid = await ctx.db.insert("clientes", {
      nombre: "C",
      prioridad: "media",
      propietario: uid,
      registrado_por: uid,
      archivado: false,
    });
    for (const v of ventas) {
      await ctx.db.insert("ventas", {
        cliente_id: cid,
        producto: "P",
        importe: 100,
        cantidad: 1,
        estado: v.estado,
        fecha: 1,
        vendedor: uid,
        registrado_por: uid,
        archivado: v.archivado,
      });
    }
    return await derivarEstadoCliente(ctx, cid, new Map());
  });
}

describe("derivarEstadoCliente (acotado por índice, ignora archivadas)", () => {
  it("ganada no archivada → ganado", async () => {
    expect(
      await estadoConVentas([
        { estado: "ganada", archivado: false },
        { estado: "abierta", archivado: false },
      ]),
    ).toBe("ganado");
  });

  it("ganada archivada + perdida activa → perdido (ignora archivadas)", async () => {
    expect(
      await estadoConVentas([
        { estado: "ganada", archivado: true },
        { estado: "perdida", archivado: false },
      ]),
    ).toBe("perdido");
  });

  it("solo abierta → en_negociacion", async () => {
    expect(await estadoConVentas([{ estado: "abierta", archivado: false }])).toBe("en_negociacion");
  });

  it("sin ventas → nuevo_lead", async () => {
    expect(await estadoConVentas([])).toBe("nuevo_lead");
  });

  it("con cientos de ventas prioriza ganada (índice + .first(), lecturas acotadas)", async () => {
    const muchas: VentaSpec[] = Array.from({ length: 300 }, () => ({
      estado: "perdida" as const,
      archivado: false,
    }));
    muchas.push({ estado: "ganada", archivado: false });
    // El .first() sobre (cliente_id, archivado, estado="ganada") resuelve sin recorrer las 300.
    expect(await estadoConVentas(muchas)).toBe("ganado");
  });
});

type VentaValor = {
  estado: "ganada" | "abierta" | "perdida";
  importe: number;
  cantidad: number;
  archivado: boolean;
};

async function valorConVentas(ventas: VentaValor[]) {
  const t = convexTest(schema, modules);
  return await t.run(async (ctx) => {
    const uid = await ctx.db.insert("usuarios", { nombre: "U", email: "u@x.test", rol: "vendedor" });
    const cid = await ctx.db.insert("clientes", {
      nombre: "C",
      prioridad: "media",
      propietario: uid,
      registrado_por: uid,
      archivado: false,
    });
    for (const v of ventas) {
      await ctx.db.insert("ventas", {
        cliente_id: cid,
        producto: "P",
        importe: v.importe,
        cantidad: v.cantidad,
        estado: v.estado,
        fecha: 1,
        vendedor: uid,
        registrado_por: uid,
        archivado: v.archivado,
      });
    }
    return await derivarValorCliente(ctx, cid);
  });
}

describe("derivarValorCliente (Σ ganadas no archivadas · importe*cantidad)", () => {
  it("suma solo ganadas no archivadas, contando la cantidad", async () => {
    expect(
      await valorConVentas([
        { estado: "ganada", importe: 100, cantidad: 3, archivado: false }, // 300
        { estado: "ganada", importe: 50, cantidad: 1, archivado: false }, // 50
        { estado: "abierta", importe: 1000, cantidad: 5, archivado: false }, // ignorada
        { estado: "perdida", importe: 999, cantidad: 9, archivado: false }, // ignorada
        { estado: "ganada", importe: 500, cantidad: 2, archivado: true }, // archivada → ignorada
      ]),
    ).toBe(350);
  });

  it("sin ventas ganadas → 0", async () => {
    expect(await valorConVentas([{ estado: "abierta", importe: 100, cantidad: 1, archivado: false }])).toBe(0);
    expect(await valorConVentas([])).toBe(0);
  });
});
