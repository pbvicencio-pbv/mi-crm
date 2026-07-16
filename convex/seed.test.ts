import { describe, it, expect, afterEach, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

afterEach(() => vi.unstubAllEnvs());

describe("seed:run (interna, env-gated, colisión segura)", () => {
  it("sin CRM_ALLOW_SEED → falla cerrado", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(internal.seed.run, {})).rejects.toThrow();
  });

  it("con la variable → siembra 2 usuarios y 5 clientes marcados [DEMO]", async () => {
    vi.stubEnv("CRM_ALLOW_SEED", "true");
    const t = convexTest(schema, modules);
    const r = await t.mutation(internal.seed.run, {});
    expect(r.ok).toBe(true);
    const conteo = await t.run(async (ctx) => {
      const us = await ctx.db.query("usuarios").collect();
      const cs = await ctx.db.query("clientes").collect();
      return { us: us.length, cs: cs.length, todosDemo: cs.every((c) => (c.notas ?? "").startsWith("[DEMO:TAL-16]")) };
    });
    expect(conteo).toEqual({ us: 2, cs: 5, todosDemo: true });
  });

  it("reejecutar no duplica (borrado acotado)", async () => {
    vi.stubEnv("CRM_ALLOW_SEED", "true");
    const t = convexTest(schema, modules);
    await t.mutation(internal.seed.run, {});
    await t.mutation(internal.seed.run, {});
    const cs = await t.run((ctx) => ctx.db.query("clientes").collect());
    expect(cs.length).toBe(5);
  });

  it("email demo ocupado por cuenta con authId → aborta", async () => {
    vi.stubEnv("CRM_ALLOW_SEED", "true");
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("usuarios", {
        nombre: "Real",
        email: "elena.demo@pulsecrm.test",
        rol: "duena",
        authId: "real-123",
      });
    });
    await expect(t.mutation(internal.seed.run, {})).rejects.toThrow();
  });

  it("no cambia el nombre de un usuario demo existente (lo reutiliza)", async () => {
    vi.stubEnv("CRM_ALLOW_SEED", "true");
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("usuarios", {
        nombre: "Nombre Previo",
        email: "elena.demo@pulsecrm.test",
        rol: "duena",
      });
    });
    await t.mutation(internal.seed.run, {});
    const nombre = await t.run(async (ctx) => {
      const u = await ctx.db
        .query("usuarios")
        .withIndex("por_email", (q) => q.eq("email", "elena.demo@pulsecrm.test"))
        .unique();
      return u?.nombre;
    });
    expect(nombre).toBe("Nombre Previo");
  });

  it("tras sembrar, agendaHoy incluye la tarea creada en `now` (en cualquier zona)", async () => {
    vi.stubEnv("CRM_ALLOW_SEED", "true");
    const t = convexTest(schema, modules);
    await t.mutation(internal.seed.run, {});
    const tz = "Asia/Tokyo"; // distinta de la zona demo (America/Mexico_City)
    const fechaLocalTokyo = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const r = await t
      .withIdentity({ email: "elena.demo@pulsecrm.test" })
      .query(api.seguimientos.agendaHoy, {
        paginationOpts: { numItems: 50, cursor: null },
        timeZone: tz,
        fechaLocal: fechaLocalTokyo,
      });
    expect(r.page.some((i: { motivo: string | null }) => i.motivo === "Confirmar cierre de contrato")).toBe(
      true,
    );
  });
});
