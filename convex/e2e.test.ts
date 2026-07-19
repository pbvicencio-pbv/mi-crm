import { describe, it, expect, afterEach, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

afterEach(() => vi.unstubAllEnvs());

describe("e2e:resetE2E (interna, env-gated, wipe + reseed)", () => {
  it("sin E2E_ALLOW_RESET → falla cerrado", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(internal.e2e.resetE2E, {})).rejects.toThrow();
  });

  it("borra datos NO-demo (que seed:run dejaría) y deja el baseline (5 clientes demo)", async () => {
    vi.stubEnv("E2E_ALLOW_RESET", "true");
    const t = convexTest(schema, modules);
    // Basura sin marcar [DEMO]: el borrado ACOTADO de seed:run NO la tocaría; el WIPE de resetE2E sí.
    await t.run(async (ctx) => {
      const u = await ctx.db.insert("usuarios", { nombre: "Basura", email: "basura@x.test", rol: "vendedor" });
      const c = await ctx.db.insert("clientes", {
        nombre: "Basura Inc", prioridad: "media", propietario: u, registrado_por: u, archivado: false,
      });
      await ctx.db.insert("ventas", {
        cliente_id: c, producto: "P", importe: 1, cantidad: 1, estado: "abierta", fecha: 1,
        vendedor: u, registrado_por: u, archivado: false,
      });
    });
    const r = await t.mutation(internal.e2e.resetE2E, {});
    expect(r.ok).toBe(true);
    const estado = await t.run(async (ctx) => {
      const cs = await ctx.db.query("clientes").collect();
      return {
        clientes: cs.length,
        basuraFuera: !cs.some((c) => c.nombre === "Basura Inc"),
        todosDemo: cs.every((c) => (c.notas ?? "").startsWith("[DEMO:TAL-16]")),
      };
    });
    expect(estado).toEqual({ clientes: 5, basuraFuera: true, todosDemo: true });
  });

  it("es idempotente: dos resets seguidos dejan 5 clientes", async () => {
    vi.stubEnv("E2E_ALLOW_RESET", "true");
    const t = convexTest(schema, modules);
    await t.mutation(internal.e2e.resetE2E, {});
    await t.mutation(internal.e2e.resetE2E, {});
    const cs = await t.run((ctx) => ctx.db.query("clientes").collect());
    expect(cs.length).toBe(5);
  });
});
