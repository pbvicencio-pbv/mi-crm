import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { decidirEstado, derivarEstadoCliente } from "./lib/derivados";

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
