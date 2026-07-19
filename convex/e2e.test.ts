import { describe, it, expect, afterEach, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

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

  it("reutiliza usuarios demo con cuenta de auth (E2E con seedAuth) sin abortar", async () => {
    vi.stubEnv("E2E_ALLOW_RESET", "true");
    const t = convexTest(schema, modules);
    // Estado que deja seedAuth en el desechable: usuarios demo enlazados a una cuenta (authId).
    // Antes del fix, sembrarDemo abortaba aquí; resetE2E debe reutilizarlos (permitirAuth=true).
    await t.run(async (ctx) => {
      const authElena = await ctx.db.insert("users", { email: "elena.demo@pulsecrm.test" });
      await ctx.db.insert("usuarios", {
        nombre: "Elena Vargas", email: "elena.demo@pulsecrm.test", rol: "duena", authId: authElena,
      });
      const authCarlos = await ctx.db.insert("users", { email: "carlos.demo@pulsecrm.test" });
      await ctx.db.insert("usuarios", {
        nombre: "Carlos Méndez", email: "carlos.demo@pulsecrm.test", rol: "vendedor", authId: authCarlos,
      });
    });
    const r = await t.mutation(internal.e2e.resetE2E, {});
    expect(r.ok).toBe(true);
    expect(r.clientes).toBe(5);
  });
});

describe("e2e:ping (pública, fail-closed, eco de cloudUrl)", () => {
  it("sin E2E_ALLOW_RESET → lanza (el preflight aborta en prod)", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.e2e.ping, {})).rejects.toThrow();
  });

  it("con E2E_ALLOW_RESET → devuelve ok y un cloudUrl (string)", async () => {
    vi.stubEnv("E2E_ALLOW_RESET", "true");
    const t = convexTest(schema, modules);
    const r = await t.query(api.e2e.ping, {});
    expect(r.ok).toBe(true);
    expect(typeof r.cloudUrl).toBe("string");
  });
});
